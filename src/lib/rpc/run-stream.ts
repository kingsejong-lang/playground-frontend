/**
 * Run stream handling (ExecutionService.Run).
 *
 * - RunAccumulator turns RunEvents into an ExecutionResult view model:
 *   per-stream incremental UTF-8 decoding, seq gap detection, diagnostics,
 *   truncation, metrics.
 * - runSession drives one run: opens the stream with an AbortSignal, and if
 *   the stream drops after Accepted it reconnects by polling GetExecution
 *   (output is not replayed by contract). Aborting while polling calls Cancel.
 *
 * Usage:
 *   const ac = new AbortController();
 *   const result = await runSession({ client: api.execution, request, signal: ac.signal,
 *                                     onUpdate: setResult });
 */
import type { MessageInitShape } from '@bufbuild/protobuf';
import type { Client } from '@connectrpc/connect';
import {
  Diagnostic_Severity,
  ExecutionStatus,
  RunEvent_Phase,
  RunEvent_Stream,
  type Diagnostic,
  type ExecutionMetrics,
  type ExecutionService,
  type GetExecutionResponse,
  type RunEvent,
  type RunRequestSchema,
} from '@kingsejong-lang/playground-proto';
import { isAbort, toRpcFailure } from './errors';

export type StreamName = 'stdout' | 'stderr';

export type ExecutionStatusName =
  | 'pending'
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'compile_error'
  | 'time_limit_exceeded'
  | 'memory_limit_exceeded'
  | 'output_limit_exceeded'
  | 'cancelled'
  | 'internal_error'
  | 'unknown';

export interface OutputChunk {
  stream: StreamName;
  text: string;
}

export interface DiagnosticView {
  severity: 'error' | 'warning' | 'info';
  message: string;
  path: string;
  line: number;
  column: number;
  code: string;
}

export interface MetricsView {
  wallTimeMs: number;
  cpuTimeMs: number;
  peakMemoryBytes: number;
  stdoutBytes: number;
  stderrBytes: number;
  queueTimeMs: number;
}

/** JSON-serialisable result of one run (also stored in history). */
export interface ExecutionResult {
  executionId?: string;
  status: ExecutionStatusName;
  success: boolean;
  exitCode?: number;
  chunks: OutputChunk[];
  diagnostics: DiagnosticView[];
  truncated: { stream: StreamName; droppedBytes: number }[];
  metrics?: MetricsView;
  /** Safe, server-provided reason for non-success statuses. */
  message?: string;
  /** Number of missing seq values (output may be incomplete when > 0). */
  gaps: number;
  /** True when the final status came from GetExecution after a dropped stream. */
  reconnected: boolean;
  phase?: 'compile' | 'run';
  queuePosition?: number;
}

export const TERMINAL_STATUSES: ReadonlySet<ExecutionStatusName> = new Set([
  'succeeded',
  'failed',
  'compile_error',
  'time_limit_exceeded',
  'memory_limit_exceeded',
  'output_limit_exceeded',
  'cancelled',
  'internal_error',
]);

const STATUS_NAMES: Record<ExecutionStatus, ExecutionStatusName> = {
  [ExecutionStatus.UNSPECIFIED]: 'unknown',
  [ExecutionStatus.QUEUED]: 'queued',
  [ExecutionStatus.RUNNING]: 'running',
  [ExecutionStatus.SUCCEEDED]: 'succeeded',
  [ExecutionStatus.FAILED]: 'failed',
  [ExecutionStatus.COMPILE_ERROR]: 'compile_error',
  [ExecutionStatus.TIME_LIMIT_EXCEEDED]: 'time_limit_exceeded',
  [ExecutionStatus.MEMORY_LIMIT_EXCEEDED]: 'memory_limit_exceeded',
  [ExecutionStatus.OUTPUT_LIMIT_EXCEEDED]: 'output_limit_exceeded',
  [ExecutionStatus.CANCELLED]: 'cancelled',
  [ExecutionStatus.INTERNAL_ERROR]: 'internal_error',
};

export function statusName(status: ExecutionStatus): ExecutionStatusName {
  return STATUS_NAMES[status] ?? 'unknown';
}

function streamName(stream: RunEvent_Stream): StreamName {
  return stream === RunEvent_Stream.STDERR ? 'stderr' : 'stdout';
}

function severityName(s: Diagnostic_Severity): DiagnosticView['severity'] {
  if (s === Diagnostic_Severity.WARNING) return 'warning';
  if (s === Diagnostic_Severity.INFO) return 'info';
  return 'error';
}

function toMetrics(m: ExecutionMetrics | undefined): MetricsView | undefined {
  if (!m) return undefined;
  return {
    wallTimeMs: m.wallTimeMs,
    cpuTimeMs: m.cpuTimeMs,
    peakMemoryBytes: Number(m.peakMemoryBytes),
    stdoutBytes: Number(m.stdoutBytes),
    stderrBytes: Number(m.stderrBytes),
    queueTimeMs: m.queueTimeMs,
  };
}

export function toDiagnosticView(d: Diagnostic): DiagnosticView {
  return { severity: severityName(d.severity), message: d.message, path: d.path, line: d.line, column: d.column, code: d.code };
}

export function emptyResult(): ExecutionResult {
  return { status: 'pending', success: false, chunks: [], diagnostics: [], truncated: [], gaps: 0, reconnected: false };
}

/** Folds RunEvents into an ExecutionResult. Not thread-safe; one per stream. */
export class RunAccumulator {
  private lastSeq = 0n;
  private finished = false;
  // One streaming decoder per output stream: a multi-byte character may be
  // split across chunks, and stdout/stderr bytes must never be mixed.
  private readonly decoders: Record<StreamName, TextDecoder> = {
    stdout: new TextDecoder('utf-8'),
    stderr: new TextDecoder('utf-8'),
  };
  private result: ExecutionResult = emptyResult();

  get isFinished(): boolean {
    return this.finished;
  }

  get executionId(): string | undefined {
    return this.result.executionId;
  }

  /** Applies one event. Returns false when the event was a duplicate/out-of-order and ignored. */
  apply(ev: RunEvent): boolean {
    if (ev.seq > 0n) {
      if (ev.seq <= this.lastSeq) return false;
      if (this.lastSeq > 0n && ev.seq > this.lastSeq + 1n) {
        this.result = { ...this.result, gaps: this.result.gaps + Number(ev.seq - this.lastSeq - 1n) };
      } else if (this.lastSeq === 0n && ev.seq > 1n) {
        this.result = { ...this.result, gaps: this.result.gaps + Number(ev.seq - 1n) };
      }
      this.lastSeq = ev.seq;
    }

    const e = ev.event;
    switch (e.case) {
      case 'accepted':
        this.result = { ...this.result, executionId: e.value.executionId, status: 'queued' };
        break;
      case 'queued':
        this.result = { ...this.result, status: 'queued', queuePosition: e.value.position };
        break;
      case 'started':
        this.result = {
          ...this.result,
          status: 'running',
          queuePosition: undefined,
          phase: e.value.phase === RunEvent_Phase.COMPILE ? 'compile' : 'run',
        };
        break;
      case 'output': {
        const stream = streamName(e.value.stream);
        this.appendText(stream, this.decoders[stream].decode(e.value.data, { stream: true }));
        break;
      }
      case 'diagnostic':
        this.result = { ...this.result, diagnostics: [...this.result.diagnostics, toDiagnosticView(e.value)] };
        break;
      case 'truncated':
        this.result = {
          ...this.result,
          truncated: [...this.result.truncated, { stream: streamName(e.value.stream), droppedBytes: Number(e.value.droppedBytes) }],
        };
        break;
      case 'finished': {
        this.flushDecoders();
        const status = statusName(e.value.status);
        this.result = {
          ...this.result,
          status,
          success: status === 'succeeded',
          exitCode: e.value.exitCode,
          metrics: toMetrics(e.value.metrics),
          message: e.value.message || undefined,
        };
        this.finished = true;
        break;
      }
      case 'heartbeat':
      default:
        break;
    }
    return true;
  }

  /** Applies the final state fetched with GetExecution after a dropped stream. */
  applyExecution(r: GetExecutionResponse): void {
    this.flushDecoders();
    const status = statusName(r.status);
    this.result = {
      ...this.result,
      status,
      success: status === 'succeeded',
      exitCode: r.exitCode,
      metrics: toMetrics(r.metrics) ?? this.result.metrics,
      reconnected: true,
    };
    this.finished = TERMINAL_STATUSES.has(status);
  }

  /** Ends the run locally with a status (cancel, lost connection). */
  end(status: ExecutionStatusName, message?: string, reconnected = this.result.reconnected): void {
    this.flushDecoders();
    this.result = { ...this.result, status, success: status === 'succeeded', message, reconnected };
    this.finished = true;
  }

  snapshot(): ExecutionResult {
    return this.result;
  }

  private flushDecoders(): void {
    for (const stream of ['stdout', 'stderr'] as const) {
      const rest = this.decoders[stream].decode();
      if (rest) this.appendText(stream, rest);
    }
  }

  private appendText(stream: StreamName, text: string): void {
    if (!text) return;
    const chunks = this.result.chunks;
    const last = chunks[chunks.length - 1];
    const next =
      last && last.stream === stream
        ? [...chunks.slice(0, -1), { stream, text: last.text + text }]
        : [...chunks, { stream, text }];
    this.result = { ...this.result, chunks: next };
  }
}

export type RunRequestInit = MessageInitShape<typeof RunRequestSchema>;

export interface RunSessionOptions {
  client: Client<typeof ExecutionService>;
  request: RunRequestInit;
  signal: AbortSignal;
  onUpdate?: (result: ExecutionResult) => void;
  /** Delays between GetExecution polls after a dropped stream. */
  reconnectDelaysMs?: readonly number[];
  /** Injectable for tests. Resolves early (without throwing) when the signal aborts. */
  sleep?: (ms: number, signal: AbortSignal) => Promise<void>;
}

export const DEFAULT_RECONNECT_DELAYS_MS = [1000, 2000, 4000, 8000, 8000] as const;

export const LOST_CONNECTION_MESSAGE = 'Lost connection to the server; the final status is unknown.';

function defaultSleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const t = setTimeout(done, ms);
    function done() {
      clearTimeout(t);
      signal.removeEventListener('abort', done);
      resolve();
    }
    signal.addEventListener('abort', done, { once: true });
  });
}

/**
 * Runs code and resolves with the final ExecutionResult.
 * Rejects only for errors before Accepted (validation, quota, unavailable);
 * map them with toRpcFailure().
 */
export async function runSession(opts: RunSessionOptions): Promise<ExecutionResult> {
  const { client, request, signal, onUpdate } = opts;
  const sleep = opts.sleep ?? defaultSleep;
  const delays = opts.reconnectDelaysMs ?? DEFAULT_RECONNECT_DELAYS_MS;
  const acc = new RunAccumulator();
  const emit = () => onUpdate?.(acc.snapshot());

  try {
    // timeoutMs: 0 disables the transport's unary default; the server bounds the stream.
    for await (const ev of client.run(request, { signal, timeoutMs: 0 })) {
      if (acc.apply(ev)) emit();
      if (acc.isFinished) break;
    }
  } catch (err) {
    if (signal.aborted || isAbort(err)) {
      acc.end('cancelled', 'Cancelled');
      emit();
      return acc.snapshot();
    }
    if (!acc.executionId) throw err; // rejected before Accepted: an RPC error
    const failure = toRpcFailure(err);
    if (!['unavailable', 'deadline_exceeded', 'internal'].includes(failure.kind)) {
      acc.end('unknown', failure.message);
      emit();
      return acc.snapshot();
    }
  }

  if (acc.isFinished) return acc.snapshot();

  if (!acc.executionId) {
    // Stream closed without Accepted: contract violation; nothing to reconnect to.
    acc.end('unknown', LOST_CONNECTION_MESSAGE);
    emit();
    return acc.snapshot();
  }

  // Dropped after Accepted (or closed without Finished): poll GetExecution.
  const executionId = acc.executionId;
  for (const delay of delays) {
    await sleep(delay, signal);
    if (signal.aborted) {
      // No stream to abort any more; ask the server to stop the run.
      try {
        await client.cancel({ executionId });
      } catch {
        // best effort; the server also stops idle runs
      }
      acc.end('cancelled', 'Cancelled', true);
      emit();
      return acc.snapshot();
    }
    try {
      const r = await client.getExecution({ executionId });
      acc.applyExecution(r);
      emit();
      if (acc.isFinished) return acc.snapshot();
    } catch {
      // keep polling until retries are exhausted
    }
  }
  acc.end('unknown', LOST_CONNECTION_MESSAGE, true);
  emit();
  return acc.snapshot();
}
