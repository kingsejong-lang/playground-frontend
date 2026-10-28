import { create } from '@bufbuild/protobuf';
import { Code, ConnectError, createClient, createRouterTransport } from '@connectrpc/connect';
import { ErrorDetailSchema, ErrorDetail_Reason, ShareService } from '@kingsejong-lang/playground-proto';
import { RpcFailureError, errorMessage, isAbort, toRpcFailure } from '../errors';
import { createApiTransport } from '../transport';

function withDetail(code: Code, detail: Partial<{ reason: ErrorDetail_Reason; field: string; retryAfterSeconds: number }>, msg = 'server text') {
  return new ConnectError(msg, code, undefined, [{ desc: ErrorDetailSchema, value: create(ErrorDetailSchema, detail) }]);
}

describe('toRpcFailure', () => {
  it('maps VALIDATION with field path and keeps the safe server text', () => {
    const f = toRpcFailure(withDetail(Code.InvalidArgument, { reason: ErrorDetail_Reason.VALIDATION, field: 'files.files[0].path' }, 'bad path'));
    expect(f.kind).toBe('validation');
    expect(f.field).toBe('files.files[0].path');
    expect(f.message).toContain('bad path');
    expect(f.message).toContain('files.files[0].path');
  });

  it('maps RATE_LIMITED with retry_after_seconds', () => {
    const f = toRpcFailure(withDetail(Code.ResourceExhausted, { reason: ErrorDetail_Reason.RATE_LIMITED, retryAfterSeconds: 12 }));
    expect(f).toMatchObject({ kind: 'rate_limited', retryAfterSeconds: 12 });
    expect(f.message).toMatch(/Try again in 12 s/);
  });

  it.each([
    [ErrorDetail_Reason.CONCURRENCY_LIMIT, Code.ResourceExhausted, 'concurrency_limit'],
    [ErrorDetail_Reason.OVERLOADED, Code.Unavailable, 'overloaded'],
    [ErrorDetail_Reason.NOT_FOUND, Code.NotFound, 'not_found'],
    [ErrorDetail_Reason.UNAUTHENTICATED, Code.Unauthenticated, 'unauthenticated'],
    [ErrorDetail_Reason.PAYLOAD_TOO_LARGE, Code.ResourceExhausted, 'payload_too_large'],
    [ErrorDetail_Reason.ORIGIN_REJECTED, Code.PermissionDenied, 'origin_rejected'],
  ])('reason %s wins over code', (reason, code, kind) => {
    expect(toRpcFailure(withDetail(code, { reason })).kind).toBe(kind);
  });

  it('never shows internal server text for non-validation errors', () => {
    const f = toRpcFailure(new ConnectError('dial tcp 10.0.0.3: refused', Code.Internal));
    expect(f.kind).toBe('internal');
    expect(f.message).not.toContain('10.0.0.3');
  });

  it('falls back to the status code without details', () => {
    expect(toRpcFailure(new ConnectError('x', Code.NotFound)).kind).toBe('not_found');
    expect(toRpcFailure(new ConnectError('x', Code.Unavailable)).kind).toBe('unavailable');
  });

  it('passes client-side failures through', () => {
    const e = new RpcFailureError({ kind: 'validation', message: 'nope' });
    expect(toRpcFailure(e).message).toBe('nope');
  });

  it('maps a rejected fetch (backend absent) to unavailable', async () => {
    const transport = createApiTransport({
      baseUrl: 'http://127.0.0.1:1',
      fetch: () => Promise.reject(new TypeError('Failed to fetch')),
    });
    const client = createClient(ShareService, transport);
    const err = await client.getShare({ id: 'abcdefgh' }).catch((e: unknown) => e);
    const f = toRpcFailure(err);
    expect(f.kind).toBe('unavailable');
    expect(errorMessage(err)).toMatch(/server is unavailable/);
  });

  it('recognises aborts', () => {
    expect(isAbort(new ConnectError('x', Code.Canceled))).toBe(true);
    expect(isAbort(new DOMException('x', 'AbortError'))).toBe(true);
    expect(isAbort(new Error('x'))).toBe(false);
  });

  it('works end to end through a router transport', async () => {
    const transport = createRouterTransport(({ service }) => {
      service(ShareService, {
        getShare() {
          throw withDetail(Code.NotFound, { reason: ErrorDetail_Reason.NOT_FOUND });
        },
      });
    });
    const err = await createClient(ShareService, transport).getShare({ id: 'abcdefgh' }).catch((e: unknown) => e);
    expect(toRpcFailure(err).kind).toBe('not_found');
  });
});
