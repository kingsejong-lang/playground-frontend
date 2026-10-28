import { create, toBinary } from '@bufbuild/protobuf';
import { Code, ConnectError, createClient, createRouterTransport } from '@connectrpc/connect';
import {
  ExecutionService,
  ExecutionStatus,
  RunEventSchema,
  RunEvent_Stream,
  type RunEvent,
} from '@kingsejong-lang/playground-proto';
import { RunAccumulator, runSession, type ExecutionResult } from '../run-stream';
import { createApiTransport } from '../transport';

const enc = new TextEncoder();
type Init = Parameters<typeof create<typeof RunEventSchema>>[1];
const ev = (seq: number, event: NonNullable<Init>['event']): RunEvent => create(RunEventSchema, { seq: BigInt(seq), event });
const accepted = (seq = 1) => ev(seq, { case: 'accepted', value: { executionId: 'exec_0123456789abcdefghijkl' } });
const out = (seq: number, data: Uint8Array | string, stream = RunEvent_Stream.STDOUT) =>
  ev(seq, { case: 'output', value: { stream, data: typeof data === 'string' ? enc.encode(data) : data } });
const finished = (seq: number, status = ExecutionStatus.SUCCEEDED) =>
  ev(seq, { case: 'finished', value: { status, exitCode: 0, metrics: { wallTimeMs: 12, peakMemoryBytes: 2048n } } });

const noSleep = async () => {};
const request = { languageId: 'kingsejong', files: { files: [{ path: 'main.ksj', content: '출력("안녕")' }] } };

function clientWith(impl: Parameters<typeof createRouterTransport>[0]) {
  return createClient(ExecutionService, createRouterTransport(impl));
}

describe('RunAccumulator', () => {
  it('decodes a multi-byte character split across chunks', () => {
    const bytes = enc.encode('안녕');
    const acc = new RunAccumulator();
    acc.apply(accepted());
    acc.apply(out(2, bytes.slice(0, 2)));
    expect(acc.snapshot().chunks).toEqual([]); // incomplete sequence held back
    acc.apply(out(3, bytes.slice(2)));
    acc.apply(finished(4));
    expect(acc.snapshot().chunks).toEqual([{ stream: 'stdout', text: '안녕' }]);
  });

  it('keeps stdout and stderr decoders independent', () => {
    const a = enc.encode('가');
    const acc = new RunAccumulator();
    acc.apply(accepted());
    acc.apply(out(2, a.slice(0, 1)));
    acc.apply(out(3, 'err', RunEvent_Stream.STDERR));
    acc.apply(out(4, a.slice(1)));
    acc.apply(finished(5));
    expect(acc.snapshot().chunks).toEqual([
      { stream: 'stderr', text: 'err' },
      { stream: 'stdout', text: '가' },
    ]);
  });

  it('counts seq gaps and ignores duplicates', () => {
    const acc = new RunAccumulator();
    acc.apply(accepted(1));
    acc.apply(out(2, 'a'));
    expect(acc.apply(out(2, 'dup'))).toBe(false);
    acc.apply(out(5, 'b'));
    acc.apply(finished(6));
    const r = acc.snapshot();
    expect(r.gaps).toBe(2);
    expect(r.chunks).toEqual([{ stream: 'stdout', text: 'ab' }]);
    expect(r).toMatchObject({ status: 'succeeded', success: true, exitCode: 0 });
    expect(r.metrics?.peakMemoryBytes).toBe(2048);
  });
});

describe('runSession', () => {
  it('reports output incrementally before Finished', async () => {
    const client = clientWith(({ service }) => {
      service(ExecutionService, {
        async *run() {
          yield accepted();
          yield out(2, 'hello ');
          yield out(3, 'world');
          yield finished(4);
        },
      });
    });
    const updates: ExecutionResult[] = [];
    const result = await runSession({ client, request, signal: new AbortController().signal, onUpdate: (r) => updates.push(r) });
    expect(updates.some((u) => u.chunks[0]?.text === 'hello ' && u.status !== 'succeeded')).toBe(true);
    expect(result.chunks).toEqual([{ stream: 'stdout', text: 'hello world' }]);
    expect(result.success).toBe(true);
  });

  it('rejects with the RPC error when the run is refused before Accepted', async () => {
    const client = clientWith(({ service }) => {
      service(ExecutionService, {
        async *run() {
          throw new ConnectError('slow down', Code.ResourceExhausted);
        },
      });
    });
    await expect(runSession({ client, request, signal: new AbortController().signal })).rejects.toMatchObject({
      code: Code.ResourceExhausted,
    });
  });

  it('aborts the underlying fetch through the AbortSignal', async () => {
    // Real Connect transport over a fake fetch: the response body sends Accepted, then hangs.
    let fetchSignal: AbortSignal | undefined;
    const fakeFetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
      fetchSignal = init?.signal ?? undefined;
      const msg = toBinary(RunEventSchema, accepted());
      const frame = new Uint8Array(5 + msg.length);
      new DataView(frame.buffer).setUint32(1, msg.length);
      frame.set(msg, 5);
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(frame);
          fetchSignal?.addEventListener('abort', () => controller.error(new DOMException('aborted', 'AbortError')));
        },
      });
      return new Response(body, { status: 200, headers: { 'content-type': 'application/connect+proto' } });
    };
    const client = createClient(ExecutionService, createApiTransport({ baseUrl: 'http://api.test', fetch: fakeFetch }));
    const ac = new AbortController();
    const result = await runSession({ client, request, signal: ac.signal, onUpdate: (r) => r.executionId && ac.abort() });
    expect(result.status).toBe('cancelled');
    expect(fetchSignal?.aborted).toBe(true);
  });

  it('reconnects with GetExecution when the stream drops after Accepted', async () => {
    const getExecution = vi
      .fn()
      .mockResolvedValueOnce({ executionId: 'x', status: ExecutionStatus.RUNNING })
      .mockResolvedValueOnce({ executionId: 'x', status: ExecutionStatus.SUCCEEDED, exitCode: 0, metrics: { wallTimeMs: 30 } });
    const client = clientWith(({ service }) => {
      service(ExecutionService, {
        async *run() {
          yield accepted();
          yield out(2, 'partial');
          throw new ConnectError('gateway pod restarted', Code.Unavailable);
        },
        getExecution: getExecution,
      });
    });
    const result = await runSession({ client, request, signal: new AbortController().signal, sleep: noSleep });
    expect(getExecution).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ status: 'succeeded', success: true, reconnected: true });
    expect(result.chunks[0].text).toBe('partial');
  });

  it('gives up after bounded retries', async () => {
    const client = clientWith(({ service }) => {
      service(ExecutionService, {
        async *run() {
          yield accepted();
          throw new ConnectError('down', Code.Unavailable);
        },
        getExecution() {
          throw new ConnectError('down', Code.Unavailable);
        },
      });
    });
    const result = await runSession({ client, request, signal: new AbortController().signal, sleep: noSleep, reconnectDelaysMs: [1, 1] });
    expect(result).toMatchObject({ status: 'unknown', reconnected: true });
    expect(result.message).toMatch(/Lost connection/);
  });

  it('calls Cancel when the user cancels while only polling is active', async () => {
    const cancel = vi.fn().mockResolvedValue({ cancelled: true });
    const ac = new AbortController();
    const client = clientWith(({ service }) => {
      service(ExecutionService, {
        async *run() {
          yield accepted();
          throw new ConnectError('down', Code.Unavailable);
        },
        getExecution: vi.fn().mockResolvedValue({ status: ExecutionStatus.RUNNING }),
        cancel,
      });
    });
    const sleep = async () => {
      ac.abort();
    };
    const result = await runSession({ client, request, signal: ac.signal, sleep });
    expect(cancel).toHaveBeenCalledWith(expect.objectContaining({ executionId: 'exec_0123456789abcdefghijkl' }), expect.anything());
    expect(result.status).toBe('cancelled');
  });
});
