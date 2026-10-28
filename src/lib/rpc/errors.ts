/**
 * Maps Connect errors (code + playground.api.v1.ErrorDetail) to safe UI failures.
 *
 * Usage:
 *   try { await client.getShare({ id }) }
 *   catch (e) { const f = toRpcFailure(e); showError(f.message); }
 */
import { Code, ConnectError } from '@connectrpc/connect';
import { ErrorDetailSchema, ErrorDetail_Reason } from '@kingsejong-lang/playground-proto';

export type RpcFailureKind =
  | 'validation'
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'rate_limited'
  | 'concurrency_limit'
  | 'overloaded'
  | 'payload_too_large'
  | 'language_unavailable'
  | 'origin_rejected'
  | 'unavailable'
  | 'cancelled'
  | 'deadline_exceeded'
  | 'internal';

export interface RpcFailure {
  kind: RpcFailureKind;
  /** Safe, human-readable message for display. Never contains server internals. */
  message: string;
  code?: Code;
  reason?: ErrorDetail_Reason;
  /** Field path for validation failures, e.g. "files.files[0].path". */
  field?: string;
  /** Seconds to wait before retrying (rate limit / overload). */
  retryAfterSeconds?: number;
}

/** Error type thrown by client-side checks so callers handle one failure shape. */
export class RpcFailureError extends Error {
  readonly failure: RpcFailure;
  constructor(failure: RpcFailure) {
    super(failure.message);
    this.name = 'RpcFailureError';
    this.failure = failure;
  }
}

const REASON_KIND: Partial<Record<ErrorDetail_Reason, RpcFailureKind>> = {
  [ErrorDetail_Reason.VALIDATION]: 'validation',
  [ErrorDetail_Reason.UNAUTHENTICATED]: 'unauthenticated',
  [ErrorDetail_Reason.FORBIDDEN]: 'forbidden',
  [ErrorDetail_Reason.NOT_FOUND]: 'not_found',
  [ErrorDetail_Reason.RATE_LIMITED]: 'rate_limited',
  [ErrorDetail_Reason.CONCURRENCY_LIMIT]: 'concurrency_limit',
  [ErrorDetail_Reason.OVERLOADED]: 'overloaded',
  [ErrorDetail_Reason.LANGUAGE_UNAVAILABLE]: 'language_unavailable',
  [ErrorDetail_Reason.PAYLOAD_TOO_LARGE]: 'payload_too_large',
  [ErrorDetail_Reason.ORIGIN_REJECTED]: 'origin_rejected',
  [ErrorDetail_Reason.INTERNAL]: 'internal',
};

const CODE_KIND: Partial<Record<Code, RpcFailureKind>> = {
  [Code.InvalidArgument]: 'validation',
  [Code.Unauthenticated]: 'unauthenticated',
  [Code.PermissionDenied]: 'forbidden',
  [Code.NotFound]: 'not_found',
  [Code.ResourceExhausted]: 'rate_limited',
  [Code.Unavailable]: 'unavailable',
  [Code.Canceled]: 'cancelled',
  [Code.DeadlineExceeded]: 'deadline_exceeded',
};

const BASE_MESSAGE: Record<RpcFailureKind, string> = {
  validation: 'The request is invalid',
  unauthenticated: 'Please sign in to continue',
  forbidden: 'You are not allowed to do this',
  not_found: 'Not found',
  rate_limited: 'Too many requests',
  concurrency_limit: 'Another run is still in progress',
  overloaded: 'The server is busy',
  payload_too_large: 'The code is too large to send',
  language_unavailable: 'This language is currently unavailable',
  origin_rejected: 'This site is not allowed to call the playground server',
  unavailable: 'The playground server is unavailable. Make sure the backend is running.',
  cancelled: 'Cancelled',
  deadline_exceeded: 'The server did not answer in time',
  internal: 'Something went wrong on the server',
};

/** Builds the display message, appending field / retry hints. */
export function failureMessage(kind: RpcFailureKind, detail: { field?: string; retryAfterSeconds?: number; text?: string } = {}): string {
  let msg = BASE_MESSAGE[kind];
  if (kind === 'validation') {
    if (detail.text) msg = `${msg}: ${detail.text}`;
    if (detail.field) msg = `${msg} (${detail.field})`;
  }
  if (detail.retryAfterSeconds && detail.retryAfterSeconds > 0) {
    msg = `${msg}. Try again in ${detail.retryAfterSeconds} s.`;
  }
  return msg;
}

/** True when the error is a network-level failure (fetch rejected, no HTTP response). */
function isNetworkFailure(err: ConnectError): boolean {
  if (err.code !== Code.Unknown && err.code !== Code.Unavailable) return false;
  const cause = err.cause;
  if (cause instanceof TypeError) return true;
  return /failed to fetch|networkerror|load failed|fetch failed|network/i.test(err.rawMessage);
}

/**
 * Converts any thrown value into an RpcFailure.
 * - RpcFailureError (client-side validation) is passed through.
 * - ConnectError: ErrorDetail.reason wins over the status code.
 * - fetch/network failures become `unavailable`.
 */
export function toRpcFailure(error: unknown): RpcFailure {
  if (error instanceof RpcFailureError) return error.failure;

  const err = ConnectError.from(error);
  if (isNetworkFailure(err)) {
    return { kind: 'unavailable', code: Code.Unavailable, message: failureMessage('unavailable') };
  }

  const detail = err.findDetails(ErrorDetailSchema)[0];
  const kind: RpcFailureKind =
    (detail && REASON_KIND[detail.reason]) || CODE_KIND[err.code] || 'internal';
  const field = detail?.field || undefined;
  const retryAfterSeconds = detail?.retryAfterSeconds || undefined;
  // Server messages are safe by contract only for validation; elsewhere use fixed text.
  const text = kind === 'validation' ? err.rawMessage || undefined : undefined;

  return {
    kind,
    code: err.code,
    reason: detail?.reason,
    field,
    retryAfterSeconds,
    message: failureMessage(kind, { field, retryAfterSeconds, text }),
  };
}

/** Convenience: message string for display. */
export function errorMessage(error: unknown): string {
  return toRpcFailure(error).message;
}

/** True when the failure was caused by our own AbortSignal. */
export function isAbort(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  return error instanceof ConnectError && error.code === Code.Canceled;
}
