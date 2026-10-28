'use client';

import { useRef, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  AlertTriangle,
  ChevronsDown,
  CheckCircle2,
  CircleSlash,
  Clock,
  Copy,
  Download,
  Info,
  ListOrdered,
  LoaderCircle,
  RotateCw,
  Search,
  Trash2,
  WifiOff,
  XCircle,
} from 'lucide-react';
import type { DiagnosticView, ExecutionResult, ExecutionStatusName, OutputChunk, RpcFailureKind } from '@/lib/rpc';
import { useToast } from '@/hooks/useToast';
import { AnsiText, countMatches, stripAnsi } from '@/features/execution/ansi-parser';
import { Button, IconButton } from '@/components/ui/Button';
import { KeyCombo } from '@/components/ui/Kbd';
import { resultText } from './history';

/** Request-level failures the user can fix by trying again. */
const RETRYABLE: ReadonlySet<RpcFailureKind> = new Set([
  'unavailable',
  'overloaded',
  'rate_limited',
  'concurrency_limit',
  'deadline_exceeded',
  'internal',
  'language_unavailable',
]);

/** Failures that only ask the user to wait: shown as a warning, not an error. */
const WAIT_KINDS: ReadonlySet<RpcFailureKind> = new Set(['rate_limited', 'overloaded', 'concurrency_limit']);

/** Retry that stays disabled while the server-requested wait counts down. */
function RetryButton({ seconds, onRetry, label }: { seconds: number; onRetry: () => void; label: string }) {
  const [left, setLeft] = useState(Math.ceil(seconds));
  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);
  return (
    <Button size="sm" icon={<RotateCw />} onClick={onRetry} disabled={left > 0}>
      {left > 0 ? `${label} (${left})` : label}
    </Button>
  );
}

type Tone = 'ok' | 'err' | 'warn' | 'info' | 'muted';

const STATUS_TONE: Record<ExecutionStatusName, Tone> = {
  pending: 'info',
  queued: 'info',
  running: 'info',
  succeeded: 'ok',
  failed: 'err',
  compile_error: 'err',
  time_limit_exceeded: 'warn',
  memory_limit_exceeded: 'warn',
  output_limit_exceeded: 'warn',
  cancelled: 'muted',
  internal_error: 'err',
  unknown: 'warn',
};

const TONE_TEXT: Record<Tone, string> = {
  ok: 'text-ok',
  err: 'text-err',
  warn: 'text-warn',
  info: 'text-info',
  muted: 'text-fg-muted',
};

const TONE_SOFT: Record<Tone, string> = {
  ok: 'bg-ok-soft',
  err: 'bg-err-soft',
  warn: 'bg-warn-soft',
  info: 'bg-info-soft',
  muted: 'bg-hover',
};

function StatusIcon({ status, className = 'size-4' }: { status: ExecutionStatusName; className?: string }) {
  const props = { className, 'aria-hidden': true } as const;
  switch (status) {
    case 'succeeded':
      return <CheckCircle2 {...props} />;
    case 'failed':
    case 'compile_error':
    case 'internal_error':
      return <XCircle {...props} />;
    case 'time_limit_exceeded':
      return <Clock {...props} />;
    case 'memory_limit_exceeded':
    case 'output_limit_exceeded':
    case 'unknown':
      return <AlertTriangle {...props} />;
    case 'cancelled':
      return <CircleSlash {...props} />;
    default:
      return <LoaderCircle {...props} className={`${className} animate-spin`} />;
  }
}

function formatMs(ms: number, locale: string): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(ms / 1000)}s`;
}

function formatBytes(bytes: number, locale: string): string {
  const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${nf.format(bytes / 1024)} KB`;
  return `${nf.format(bytes / 1024 / 1024)} MB`;
}

/** Seconds since `running` became true, updated ~10x a second. */
function useElapsed(running: boolean): number {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!running) return;
    const start = performance.now();
    const update = () => setElapsed(performance.now() - start);
    const first = setTimeout(update, 0);
    const id = setInterval(update, 100);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [running]);
  return elapsed;
}

export interface BackendIssue {
  message: string;
  onRetry: () => void;
  retrying?: boolean;
}

interface OutputPanelProps {
  /** Live result while running, final result afterwards. */
  output: ExecutionResult | null;
  loading: boolean;
  /** Request-level error (validation, quota, unavailable). */
  error: string | null;
  errorKind?: RpcFailureKind | null;
  /** Server-requested wait before a retry; the Retry button counts down. */
  retryAfterSeconds?: number | null;
  streaming?: boolean;
  onClear?: () => void;
  /** Runs again (shown for retryable request errors). */
  onRetry?: () => void;
  /** Moves the editor cursor to a diagnostic. */
  onJumpTo?: (diagnostic: DiagnosticView) => void;
  onOpenTemplates?: () => void;
  /** Keys of the Run shortcut, e.g. ["⌘", "Enter"]. */
  runKeys?: string[];
  /** The page could not load languages (backend down). */
  backendIssue?: BackendIssue | null;
}

/**
 * OutputPanel - status, diagnostics and the streamed output of a run.
 */
export default function OutputPanel({
  output,
  loading,
  error,
  errorKind,
  retryAfterSeconds,
  streaming,
  onClear,
  onRetry,
  onJumpTo,
  onOpenTemplates,
  runKeys,
  backendIssue,
}: OutputPanelProps) {
  const t = useTranslations('output');
  const tErr = useTranslations('errors');
  const tb = useTranslations('backend');
  const tc = useTranslations('common');
  const locale = useLocale();
  const toast = useToast();
  const outputRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showLineNumbers, setShowLineNumbers] = useState(false);
  const running = loading || !!streaming;
  const elapsed = useElapsed(running);

  // Follow new output while the user has auto-scroll on.
  useEffect(() => {
    if (autoScroll && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output, autoScroll]);

  const getOutputText = useCallback((): string => {
    if (error) return stripAnsi(error);
    if (!output) return '';
    return stripAnsi(resultText(output));
  }, [error, output]);

  const handleCopy = useCallback(async () => {
    const text = getOutputText();
    if (!text) {
      toast.warning(t('nothingToCopy'));
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t('copied'));
    } catch {
      toast.error(t('copyFailed'));
    }
  }, [getOutputText, toast, t]);

  const handleDownload = useCallback(() => {
    const text = getOutputText();
    if (!text) {
      toast.warning(t('nothingToCopy'));
      return;
    }
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `output-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t('downloaded'));
  }, [getOutputText, toast, t]);

  const status: ExecutionStatusName | null = running ? (output?.status ?? 'pending') : (output?.status ?? null);
  const matchCount = useMemo(
    () => (searchQuery && output ? output.chunks.reduce((n, c) => n + countMatches(stripAnsi(c.text), searchQuery), 0) : 0),
    [output, searchQuery]
  );

  // Status line text for screen readers: announced once per status change, not per chunk.
  const announcement = status
    ? running
      ? output?.status === 'queued'
        ? output.queuePosition
          ? `${t('status.queued')}, ${t('queuePosition', { position: output.queuePosition })}`
          : t('status.queued')
        : t(`status.${status === 'pending' ? 'running' : status}`)
      : `${t(`status.${status}`)}${output?.metrics ? `, ${formatMs(output.metrics.wallTimeMs, locale)}` : ''}`
    : error
      ? error
      : '';

  const hasResult = !!output && !running;
  const showToolbar = !!output && (output.chunks.length > 0 || output.diagnostics.length > 0 || !running);

  return (
    <section className="flex h-full flex-col bg-panel" aria-labelledby="output-title">
      {/* Header: title, live status, tools */}
      <div className="relative flex h-10 shrink-0 items-center gap-3 border-b border-hair pl-4 pr-1.5">
        <h2 id="output-title" className="text-[13px] font-semibold text-fg-secondary">
          {t('title')}
        </h2>
        {/* The status is stated here, always visible; the summary below adds metrics and help. */}
        {status && <StatusChip status={status} running={running} output={output} elapsed={elapsed} />}
        <div className="ml-auto flex items-center" role="toolbar" aria-label={t('toolbar')}>
          {showToolbar && (
            <>
              <IconButton
                label={t('search')}
                icon={<Search />}
                size="sm"
                aria-pressed={showSearch}
                onClick={() => {
                  setShowSearch((v) => !v);
                  if (showSearch) setSearchQuery('');
                }}
              />
              <IconButton
                label={t('lineNumbers')}
                icon={<ListOrdered />}
                size="sm"
                aria-pressed={showLineNumbers}
                onClick={() => setShowLineNumbers((v) => !v)}
                className="max-sm:hidden"
              />
              <IconButton
                label={t('autoScroll')}
                icon={<ChevronsDown />}
                size="sm"
                aria-pressed={autoScroll}
                onClick={() => setAutoScroll((v) => !v)}
                className="max-sm:hidden"
              />
              <IconButton label={t('copy')} icon={<Copy />} size="sm" onClick={handleCopy} />
              <IconButton label={t('download')} icon={<Download />} size="sm" onClick={handleDownload} className="max-sm:hidden" />
            </>
          )}
          {onClear && (output || error) && !running && (
            <IconButton label={t('clear')} icon={<Trash2 />} size="sm" onClick={onClear} />
          )}
        </div>
        {/* The one authored motion: a dancheong-blue sweep along the header while a run is live. */}
        {running && (
          <span className="pointer-events-none absolute inset-x-0 -bottom-px h-0.5 overflow-hidden" aria-hidden="true">
            <span className="block h-full w-1/4 animate-run-sweep bg-accent-text" />
          </span>
        )}
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      {showSearch && (
        <div className="flex items-center gap-3 border-b border-hair px-4 py-2">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setShowSearch(false);
                setSearchQuery('');
              }
            }}
            placeholder={t('searchPlaceholder')}
            aria-label={t('search')}
            className="h-8 min-w-0 flex-1 rounded-md border border-strong bg-surface px-2.5 text-sm text-fg placeholder:text-fg-muted"
            autoFocus
          />
          {searchQuery && (
            <span className="shrink-0 text-xs text-fg-muted" aria-live="polite">
              {t('matches', { count: matchCount })}
            </span>
          )}
        </div>
      )}

      <div ref={outputRef} className="min-h-0 flex-1 overflow-auto">
        {backendIssue && !running && (
          <Callout
            tone="warn"
            icon={<WifiOff className="size-4" aria-hidden="true" />}
            title={tb('unavailableTitle')}
            action={
              <Button size="sm" icon={<RotateCw />} onClick={backendIssue.onRetry} disabled={backendIssue.retrying}>
                {tb('retry')}
              </Button>
            }
          >
            <p>{tb('unavailableBody')}</p>
          </Callout>
        )}

        {error && !running ? (
          <Callout
            tone={errorKind && WAIT_KINDS.has(errorKind) ? 'warn' : 'err'}
            icon={
              errorKind && WAIT_KINDS.has(errorKind) ? (
                <Clock className="size-4" aria-hidden="true" />
              ) : (
                <XCircle className="size-4" aria-hidden="true" />
              )
            }
            title={errorKind ? tErr(errorKind) : error}
            action={
              onRetry && errorKind && RETRYABLE.has(errorKind) ? (
                <RetryButton key={error} seconds={retryAfterSeconds ?? 0} onRetry={onRetry} label={tc('retry')} />
              ) : undefined
            }
          >
            {errorKind && error !== tErr(errorKind) && (
              <p className="whitespace-pre-wrap">{error.startsWith(tErr(errorKind)) ? error.slice(tErr(errorKind).length).replace(/^[.:]\s*/, '') : error}</p>
            )}
          </Callout>
        ) : !output ? (
          !backendIssue && <EmptyState runKeys={runKeys} onOpenTemplates={onOpenTemplates} />
        ) : (
          <div className="px-4 py-3">
            {hasResult && <ResultSummary output={output} />}

            {output.diagnostics.length > 0 && (
              <Diagnostics diagnostics={output.diagnostics} onJumpTo={onJumpTo} />
            )}

            {output.chunks.length > 0 && (
              <div className="mt-1 font-mono text-[13px] leading-6">
                {output.chunks.map((chunk, index) => (
                  <OutputChunkView
                    key={index}
                    chunk={chunk}
                    startLine={lineOffset(output.chunks, index)}
                    showLineNumbers={showLineNumbers}
                    highlight={searchQuery}
                    stderrLabel={t('stderr')}
                    onJumpTo={onJumpTo}
                  />
                ))}
              </div>
            )}

            {running && output.chunks.length === 0 && output.diagnostics.length === 0 && (
              <p className="mt-2 text-sm text-fg-muted">
                {output.status === 'queued' ? t('status.queued') : output.phase === 'compile' ? t('phase.compile') : t('status.running')}…
              </p>
            )}

            {output.truncated.map((tr, index) => (
              <Notice key={`t${index}`}>
                {t('truncated', { bytes: formatBytes(tr.droppedBytes, locale), stream: t(`stream.${tr.stream}`) })}
              </Notice>
            ))}
            {output.gaps > 0 && <Notice>{t('gaps', { count: output.gaps })}</Notice>}
            {output.reconnected && <Notice>{t('reconnected')}</Notice>}
          </div>
        )}
      </div>
    </section>
  );
}

function StatusChip({
  status,
  running,
  output,
  elapsed,
}: {
  status: ExecutionStatusName;
  running: boolean;
  output: ExecutionResult | null;
  elapsed: number;
}) {
  const t = useTranslations('output');
  const locale = useLocale();
  const tone = STATUS_TONE[status];
  let label: string;
  if (running) {
    if (output?.status === 'queued') label = output.queuePosition ? t('queuePosition', { position: output.queuePosition }) : t('status.queued');
    else if (output?.phase === 'compile') label = t('phase.compile');
    else label = t('status.running');
  } else {
    label = t(`status.${status}`);
  }
  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${TONE_SOFT[tone]} ${TONE_TEXT[tone]}`}>
      <StatusIcon status={running ? 'running' : status} className="size-3.5 shrink-0" />
      <span className="truncate">{label}</span>
      {running && <span className="tabular-nums text-fg-muted" aria-hidden="true">{formatMs(elapsed, locale)}</span>}
    </span>
  );
}

function ResultSummary({ output }: { output: ExecutionResult }) {
  const t = useTranslations('output');
  const locale = useLocale();
  const tone = STATUS_TONE[output.status];
  const helpKey = output.status in HELP_KEYS ? HELP_KEYS[output.status] : null;
  // A server-provided reason is more specific than our generic help text.
  const lostConnection = output.status === 'unknown' && /lost connection/i.test(output.message ?? '');
  // Our help says what to do next; the server's reason (if any) is a secondary detail.
  const help = lostConnection ? t('lostConnection') : helpKey ? t(helpKey) : null;
  const detail = !lostConnection && output.status !== 'cancelled' && output.message && output.message !== help ? output.message : null;
  const m = output.metrics;
  const showExit = output.exitCode !== undefined && !output.success;
  if (!m && !showExit && !(help && !output.success)) return null;
  return (
    <div className="mb-3 border-b border-hair pb-3">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        {showExit && (
          <span className={`font-mono text-xs ${TONE_TEXT[tone]}`}>{t('exitCode', { code: output.exitCode ?? '' })}</span>
        )}
        {m && (
          <dl className="flex flex-wrap gap-x-3 text-xs text-fg-muted">
            <Metric label={t('metrics.wall')} value={formatMs(m.wallTimeMs, locale)} />
            {m.cpuTimeMs > 0 && <Metric label={t('metrics.cpu')} value={formatMs(m.cpuTimeMs, locale)} />}
            <Metric label={t('metrics.memory')} value={formatBytes(m.peakMemoryBytes, locale)} />
            {m.queueTimeMs > 0 && <Metric label={t('metrics.queue')} value={formatMs(m.queueTimeMs, locale)} />}
          </dl>
        )}
      </div>
      {!output.success && help && <p className="mt-1.5 text-sm text-fg-secondary">{help}</p>}
      {!output.success && detail && <p className="mt-1 text-xs text-fg-muted">{detail}</p>}
    </div>
  );
}

const HELP_KEYS: Partial<Record<ExecutionStatusName, string>> = {
  failed: 'statusHelp.failed',
  compile_error: 'statusHelp.compile_error',
  time_limit_exceeded: 'statusHelp.time_limit_exceeded',
  memory_limit_exceeded: 'statusHelp.memory_limit_exceeded',
  output_limit_exceeded: 'statusHelp.output_limit_exceeded',
  cancelled: 'statusHelp.cancelled',
  internal_error: 'statusHelp.internal_error',
  unknown: 'statusHelp.unknown',
};

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1">
      <dt>{label}</dt>
      <dd className="tabular-nums text-fg-secondary">{value}</dd>
    </div>
  );
}

function Diagnostics({ diagnostics, onJumpTo }: { diagnostics: DiagnosticView[]; onJumpTo?: (d: DiagnosticView) => void }) {
  const t = useTranslations('output');
  return (
    <section className="mb-3" aria-label={t('diagnostics', { count: diagnostics.length })}>
      <h3 className="mb-1.5 text-xs font-semibold text-fg-muted">{t('diagnostics', { count: diagnostics.length })}</h3>
      <ul className="space-y-1">
        {diagnostics.map((d, index) => {
          const tone: Tone = d.severity === 'error' ? 'err' : d.severity === 'warning' ? 'warn' : 'info';
          const location = d.path ? `${d.path}${d.line ? `:${d.line}${d.column ? `:${d.column}` : ''}` : ''}` : '';
          const Icon = d.severity === 'error' ? XCircle : d.severity === 'warning' ? AlertTriangle : Info;
          return (
            <li key={index} className={`flex items-start gap-2 rounded-md px-2.5 py-2 text-sm ${TONE_SOFT[tone]}`}>
              <Icon className={`mt-0.5 size-4 shrink-0 ${TONE_TEXT[tone]}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <span className={`mr-2 font-medium ${TONE_TEXT[tone]}`}>{t(`severity.${d.severity}`)}</span>
                {location &&
                  (onJumpTo && d.line > 0 ? (
                    <button
                      type="button"
                      onClick={() => onJumpTo(d)}
                      className="mr-2 inline-flex min-h-6 items-center rounded-xs font-mono text-[13px] text-accent-text underline decoration-dotted underline-offset-4 hover:decoration-solid"
                      aria-label={t('jumpTo', { location })}
                      title={t('jumpTo', { location })}
                    >
                      {location}
                    </button>
                  ) : (
                    <span className="mr-2 font-mono text-[13px] text-fg-secondary">{location}</span>
                  ))}
                <span className="text-fg">
                  <AnsiText>{d.message}</AnsiText>
                </span>
                {d.code && <span className="ml-2 font-mono text-xs text-fg-muted">{d.code}</span>}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function EmptyState({ runKeys, onOpenTemplates }: { runKeys?: string[]; onOpenTemplates?: () => void }) {
  const t = useTranslations('output');
  return (
    <div className="flex h-full min-h-48 flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-[15px] font-medium text-fg">{t('emptyTitle')}</p>
      {runKeys && (
        <p className="flex flex-wrap items-center justify-center gap-1.5 text-sm text-fg-muted">
          {t.rich('emptyHint', { keys: () => <KeyCombo keys={runKeys} /> })}
        </p>
      )}
      {onOpenTemplates && (
        <button
          type="button"
          onClick={onOpenTemplates}
          className="inline-flex min-h-6 items-center text-sm text-accent-text underline decoration-1 underline-offset-4 hover:decoration-2"
        >
          {t('emptyTemplates')}
        </button>
      )}
    </div>
  );
}

function Callout({
  tone,
  icon,
  title,
  action,
  children,
}: {
  tone: Tone;
  icon: ReactNode;
  title: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className={`m-4 flex items-start gap-3 rounded-lg border border-hair p-3.5 ${TONE_SOFT[tone]}`} role={tone === 'err' ? 'alert' : undefined}>
      <span className={`mt-0.5 ${TONE_TEXT[tone]}`}>{icon}</span>
      <div className="min-w-0 flex-1 text-sm text-fg-secondary">
        <p className="font-semibold text-fg">{title}</p>
        {children && <div className="mt-1">{children}</div>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}

/** Line number of the first line of chunk `index` (sum of previous chunks' lines). */
function lineOffset(chunks: OutputChunk[], index: number): number {
  let n = 0;
  for (let i = 0; i < index; i++) n += chunks[i].text.replace(/\n$/, '').split('\n').length;
  return n;
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 flex items-start gap-2 text-xs text-fg-muted" role="note">
      <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

/** "main.ksj:7:9" style locations in runtime error output. */
const LOCATION = /([A-Za-z0-9_\-./]+\.[A-Za-z]{1,8}):(\d+)(?::(\d+))?/g;

/** Plain text with file:line[:col] locations turned into jump buttons. */
function LinkedText({ text, highlight, onJumpTo }: { text: string; highlight: string; onJumpTo: (d: DiagnosticView) => void }) {
  const t = useTranslations('output');
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(LOCATION)) {
    const at = m.index ?? 0;
    if (at > last) parts.push(<AnsiText key={`t${at}`} highlight={highlight}>{text.slice(last, at)}</AnsiText>);
    const [location, path, line, column] = m;
    parts.push(
      <button
        key={`l${at}`}
        type="button"
        onClick={() => onJumpTo({ severity: 'error', message: '', path, line: Number(line), column: Number(column ?? 0), code: '' })}
        className="rounded-xs underline decoration-dotted underline-offset-4 hover:decoration-solid"
        title={t('jumpTo', { location })}
      >
        {location}
      </button>
    );
    last = at + location.length;
  }
  if (last < text.length) parts.push(<AnsiText key="rest" highlight={highlight}>{text.slice(last)}</AnsiText>);
  return <>{parts}</>;
}

function OutputChunkView({
  chunk,
  startLine,
  showLineNumbers,
  highlight,
  stderrLabel,
  onJumpTo,
}: {
  chunk: OutputChunk;
  startLine: number;
  showLineNumbers: boolean;
  highlight: string;
  stderrLabel: string;
  onJumpTo?: (d: DiagnosticView) => void;
}) {
  const text = chunk.text.replace(/\n$/, '');
  const lines = text.split('\n');
  const isErr = chunk.stream === 'stderr';
  return (
    <div className="flex">
      {showLineNumbers && (
        <div className="mr-3 shrink-0 select-none border-r border-hair pr-3 text-right text-fg-muted" aria-hidden="true">
          {lines.map((_, i) => (
            <div key={i} className="min-w-8 tabular-nums">
              {startLine + i + 1}
            </div>
          ))}
        </div>
      )}
      <pre className={`min-w-0 flex-1 whitespace-pre-wrap break-words ${isErr ? 'text-err' : 'text-fg'}`}>
        {isErr && <span className="sr-only">{stderrLabel}: </span>}
        {isErr && onJumpTo && !text.includes('\x1b') ? (
          <LinkedText text={text} highlight={highlight} onJumpTo={onJumpTo} />
        ) : (
          <AnsiText highlight={highlight}>{text}</AnsiText>
        )}
      </pre>
    </div>
  );
}
