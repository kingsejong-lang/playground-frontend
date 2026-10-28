/**
 * Runs code through ExecutionService.Run (server stream) and exposes the live result.
 *
 * - One run at a time: starting a run or unmounting aborts the previous stream.
 * - cancel() aborts the fetch (the server cancels the run); while reconnecting
 *   it calls ExecutionService.Cancel instead (see lib/rpc/run-stream.ts).
 * - Requests are validated client-side (protovalidate + total size) first.
 *
 * Usage:
 *   const { output, loading, streaming, error, execute, cancel } = useCodeExecution();
 *   execute(code, languageId, languages);
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { create } from '@bufbuild/protobuf';
import { RunRequestSchema, type Language } from '@kingsejong-lang/playground-proto';
import {
  assertFilesFit,
  assertValid,
  emptyResult,
  runSession,
  toRpcFailure,
  type RpcFailureKind,
  useRpc,
  type ExecutionResult,
} from '@/lib/rpc';
import { resolveLanguage, getMainFilename } from '@/lib/utils/language';
import { useTranslations } from 'next-intl';
import { useFailureText } from '@/hooks/useFailureText';

export interface RunFilesInput {
  languageId: string;
  files: { path: string; content: string }[];
  entryFile?: string;
}

interface UseCodeExecutionReturn {
  /** Live result while running, final result afterwards. */
  output: ExecutionResult | null;
  /** True from the moment a run starts until it ends. */
  loading: boolean;
  /** True once the server accepted the run and events are streaming. */
  streaming: boolean;
  error: string | null;
  /** Failure kind behind `error` when it came from the server or validation. */
  errorKind: RpcFailureKind | null;
  /** Seconds the server asked us to wait before retrying (rate limit / overload). */
  retryAfterSeconds: number | null;
  execute: (code: string, language: string, languages: readonly Language[]) => Promise<void>;
  executeFiles: (input: RunFilesInput) => Promise<void>;
  cancel: () => void;
  reset: () => void;
}

/** Entry-file extensions used only when the language list is unavailable. */
const FALLBACK_EXTENSIONS: Record<string, string> = { kingsejong: '.ksj', python: '.py', go: '.go' };

const ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';

/** Idempotency key matching ^[A-Za-z0-9_-]{8,64}$. */
export function newClientRequestId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(22));
  return Array.from(bytes, (b) => ID_ALPHABET[b % ID_ALPHABET.length]).join('');
}

/** Coalesces frequent stream updates into at most one React update per frame. */
function createFrameThrottle(apply: (r: ExecutionResult) => void) {
  let latest: ExecutionResult | null = null;
  let handle: ReturnType<typeof setTimeout> | number | null = null;
  const schedule =
    typeof requestAnimationFrame === 'function'
      ? (fn: () => void) => requestAnimationFrame(fn)
      : (fn: () => void) => setTimeout(fn, 16);
  const cancelFrame = (h: ReturnType<typeof setTimeout> | number) =>
    typeof cancelAnimationFrame === 'function' && typeof h === 'number' ? cancelAnimationFrame(h) : clearTimeout(h);
  return {
    push(r: ExecutionResult) {
      latest = r;
      if (handle !== null) return;
      handle = schedule(() => {
        handle = null;
        if (latest) apply(latest);
      });
    },
    cancel() {
      if (handle !== null) cancelFrame(handle);
      handle = null;
      latest = null;
    },
  };
}

export function useCodeExecution(): UseCodeExecutionReturn {
  const api = useRpc();
  const t = useTranslations('errors');
  const failureText = useFailureText();
  const [output, setOutput] = useState<ExecutionResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [streaming, setStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<RpcFailureKind | null>(null);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  // Abort an open stream when the component unmounts.
  useEffect(() => () => controllerRef.current?.abort(), []);

  const executeFiles = useCallback(
    async ({ languageId, files, entryFile }: RunFilesInput) => {
      if (!files.some((f) => f.content.trim())) {
        setError(t('emptyCode'));
        setErrorKind(null);
    setRetryAfterSeconds(null);
        return;
      }

      const request = create(RunRequestSchema, {
        languageId,
        files: { files },
        entryFile: entryFile ?? '',
        clientRequestId: newClientRequestId(),
      });
      try {
        assertValid(RunRequestSchema, request);
        assertFilesFit(files);
      } catch (err) {
        setOutput(null);
        setError(failureText(err));
        setErrorKind(toRpcFailure(err).kind);
          setRetryAfterSeconds(toRpcFailure(err).retryAfterSeconds ?? null);
        return;
      }

      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      setLoading(true);
      setStreaming(false);
      setOutput(emptyResult());
      setError(null);
      setErrorKind(null);
    setRetryAfterSeconds(null);

      const throttle = createFrameThrottle((r) => {
        if (controllerRef.current !== controller) return;
        setOutput(r);
        if (r.executionId) setStreaming(true);
      });

      try {
        const result = await runSession({
          client: api.execution,
          request,
          signal: controller.signal,
          onUpdate: throttle.push,
        });
        throttle.cancel();
        if (controllerRef.current === controller) setOutput(result);
      } catch (err) {
        throttle.cancel();
        if (controllerRef.current === controller) {
          setOutput(null);
          setError(failureText(err));
          setErrorKind(toRpcFailure(err).kind);
          setRetryAfterSeconds(toRpcFailure(err).retryAfterSeconds ?? null);
        }
      } finally {
        if (controllerRef.current === controller) {
          controllerRef.current = null;
          setLoading(false);
          setStreaming(false);
        }
      }
    },
    [api, t, failureText]
  );

  const execute = useCallback(
    async (code: string, language: string, languages: readonly Language[]) => {
      if (!code.trim()) {
        setError(t('emptyCode'));
        setErrorKind(null);
    setRetryAfterSeconds(null);
        return;
      }
      const lang = resolveLanguage(language, languages);
      if (!lang && languages.length === 0 && language) {
        // The language list never loaded (backend down): send the run anyway so the
        // user gets the real server state (and a retry) instead of "language not found".
        const path = `main${FALLBACK_EXTENSIONS[language.split('_')[0]] ?? '.txt'}`;
        await executeFiles({ languageId: language, files: [{ path, content: code }], entryFile: path });
        return;
      }
      if (!lang) {
        setError(t('languageNotFound'));
        setErrorKind(null);
    setRetryAfterSeconds(null);
        return;
      }
      // Behaviour preserved: the active file is sent alone, as the entry file.
      const path = getMainFilename(lang);
      await executeFiles({ languageId: language, files: [{ path, content: code }], entryFile: path });
    },
    [executeFiles, t]
  );

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    // Detach first so the aborted run's final (cancelled) result is not shown.
    const controller = controllerRef.current;
    controllerRef.current = null;
    controller?.abort();
    setLoading(false);
    setStreaming(false);
    setOutput(null);
    setError(null);
    setErrorKind(null);
    setRetryAfterSeconds(null);
  }, []);

  return { output, loading, streaming, error, errorKind, retryAfterSeconds, execute, executeFiles, cancel, reset };
}
