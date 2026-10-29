import { create, toBinary } from '@bufbuild/protobuf';
import { Code, ConnectError, createClient, createRouterTransport } from '@connectrpc/connect';
import {
  ErrorDetailSchema,
  ErrorDetail_Reason,
  ExecutionService,
  ExecutionStatus,
  RunEventSchema,
  RunEvent_Stream,
  type RunEvent,
} from '@kingsejong-lang/playground-proto';
import { ACCEPT_GRACE_MS, RunAccumulator, runSession, type ExecutionResult } from '../run-stream';
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

describe('runSession output replay (ResumeRun)', () => {
  const dropped = new ConnectError('Failed to fetch', Code.Unavailable);
  const replayUnavailable = () =>
    new ConnectError('gone', Code.FailedPrecondition, undefined, [{ desc: ErrorDetailSchema, value: { reason: ErrorDetail_Reason.REPLAY_UNAVAILABLE } }]);

  it('resumes after the last received seq, drops duplicates and reports the reconnect', async () => {
    const resumeRun = vi.fn(async function* (req: { afterSeq: bigint }) {
      expect(req.afterSeq).toBe(2n);
      // The server may resend the last event it is unsure about; it must not be shown twice.
      yield out(2, 'one\n');
      yield out(3, 'two\n');
      yield finished(4);
    });
    const updates: ExecutionResult[] = [];
    const client = clientWith(({ service }) =>
      service(ExecutionService, {
        async *run() {
          yield accepted();
          yield out(2, 'one\n');
          throw dropped;
        },
        resumeRun,
        getExecution: () => {
          throw new Error('not expected');
        },
      } as never)
    );
    const result = await runSession({ client, request, signal: new AbortController().signal, sleep: noSleep, onUpdate: (r) => updates.push(r) });
    expect(resumeRun).toHaveBeenCalledTimes(1);
    expect(result.chunks).toEqual([{ stream: 'stdout', text: 'one\ntwo\n' }]);
    expect(result).toMatchObject({ status: 'succeeded', resumed: true, reconnected: false, gaps: 0 });
    expect(result.replayGap).toBeUndefined();
    // The reconnect note shows while the resumed run is still streaming, not only at the end.
    const firstResumed = updates.find((u) => u.resumed)!;
    expect(firstResumed.status).not.toBe('succeeded');
    expect(firstResumed.chunks[0].text).toBe('one\ntwo\n');
  });

  it('reports events the server evicted (ReplayGap) without counting them as transit gaps', async () => {
    const client = clientWith(({ service }) =>
      service(ExecutionService, {
        async *run() {
          yield accepted();
          yield out(2, 'a');
          throw dropped;
        },
        async *resumeRun() {
          yield create(RunEventSchema, { event: { case: 'replayGap', value: { firstAvailableSeq: 6n } } });
          yield out(6, 'f');
          yield finished(7);
        },
      } as never)
    );
    const result = await runSession({ client, request, signal: new AbortController().signal, sleep: noSleep });
    expect(result).toMatchObject({ status: 'succeeded', resumed: true, replayGap: 3, gaps: 0 });
    expect(result.chunks[0].text).toBe('af');
  });

  it('resumes again when the resumed stream drops too', async () => {
    const afterSeqs: bigint[] = [];
    let calls = 0;
    const client = clientWith(({ service }) =>
      service(ExecutionService, {
        async *run() {
          yield accepted();
          throw dropped;
        },
        async *resumeRun(req: { afterSeq: bigint }) {
          afterSeqs.push(req.afterSeq);
          calls++;
          if (calls === 1) {
            yield out(2, 'x');
            throw dropped;
          }
          if (calls === 2) throw dropped; // still unreachable
          yield out(3, 'y');
          yield finished(4);
        },
      } as never)
    );
    const result = await runSession({ client, request, signal: new AbortController().signal, sleep: noSleep });
    expect(afterSeqs).toEqual([1n, 2n, 2n]);
    expect(result).toMatchObject({ status: 'succeeded', resumed: true });
    expect(result.chunks[0].text).toBe('xy');
  });

  it.each([
    ['REPLAY_UNAVAILABLE', replayUnavailable],
    ['Unimplemented', () => new ConnectError('no such method', Code.Unimplemented)],
  ])('falls back to GetExecution on %s', async (_name, error) => {
    const resumeRun = vi.fn(async function* () {
      throw error();
    });
    const getExecution = vi.fn().mockResolvedValue({ executionId: 'x', status: ExecutionStatus.SUCCEEDED, exitCode: 0 });
    const client = clientWith(({ service }) =>
      service(ExecutionService, {
        async *run() {
          yield accepted();
          yield out(2, 'partial');
          throw dropped;
        },
        resumeRun,
        getExecution,
      } as never)
    );
    const result = await runSession({ client, request, signal: new AbortController().signal, sleep: noSleep });
    expect(resumeRun).toHaveBeenCalledTimes(1); // never retried once the server said it cannot replay
    expect(getExecution).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ status: 'succeeded', reconnected: true });
    expect(result.resumed).toBeUndefined();
  });

  it('cancels the run when the user stops while reconnecting', async () => {
    const controller = new AbortController();
    const cancel = vi.fn().mockResolvedValue({ cancelled: true });
    const client = clientWith(({ service }) =>
      service(ExecutionService, {
        async *run() {
          yield accepted();
          throw dropped;
        },
        async *resumeRun() {
          controller.abort();
          throw new ConnectError('aborted', Code.Canceled);
        },
        cancel,
      } as never)
    );
    const result = await runSession({ client, request, signal: controller.signal, sleep: noSleep });
    expect(cancel).toHaveBeenCalledWith(expect.objectContaining({ executionId: 'exec_0123456789abcdefghijkl' }), expect.anything());
    expect(result.status).toBe('cancelled');
  });
});

describe('runSession Stop sends an explicit Cancel', () => {
  const id = 'exec_0123456789abcdefghijkl';

  /** A run that streams Accepted (optionally after a delay) and output until its stream is closed. */
  function liveClient(opts: { acceptAfter?: Promise<void>; never?: boolean } = {}) {
    const cancel = vi.fn().mockResolvedValue({ cancelled: true });
    const closed = vi.fn();
    const client = clientWith(({ service }) =>
      service(ExecutionService, {
        async *run(_req: unknown, ctx: { signal: AbortSignal }) {
          ctx.signal.addEventListener('abort', closed);
          await opts.acceptAfter;
          if (!opts.never) yield accepted();
          yield out(2, 'working\n');
          await new Promise<void>((resolve) => ctx.signal.addEventListener('abort', () => resolve()));
        },
        cancel,
      } as never)
    );
    return { client, cancel, closed };
  }

  it('cancels the run on the server and closes the stream when stopped mid-stream', async () => {
    const { client, cancel } = liveClient();
    const ac = new AbortController();
    const pending = runSession({ client, request, signal: ac.signal, onUpdate: (r) => r.chunks.length && ac.abort() });
    const result = await pending;
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledWith(expect.objectContaining({ executionId: id }), expect.anything());
    expect(result.status).toBe('cancelled');
    expect(result.chunks[0].text).toBe('working\n');
  });

  it('stopped before Accepted: keeps the stream open for the id, then cancels', async () => {
    let accept!: () => void;
    const { client, cancel } = liveClient({ acceptAfter: new Promise<void>((r) => (accept = r)) });
    const ac = new AbortController();
    const pending = runSession({ client, request, signal: ac.signal });
    ac.abort();
    await new Promise((r) => setTimeout(r, 10));
    expect(cancel).not.toHaveBeenCalled();
    accept();
    const result = await pending;
    expect(cancel).toHaveBeenCalledWith(expect.objectContaining({ executionId: id }), expect.anything());
    expect(result.status).toBe('cancelled');
  });

  it('gives up waiting for Accepted after the grace period', async () => {
    vi.useFakeTimers();
    try {
      const { client, cancel } = liveClient({ acceptAfter: new Promise<void>(() => {}) });
      const ac = new AbortController();
      const pending = runSession({ client, request, signal: ac.signal });
      ac.abort();
      await vi.advanceTimersByTimeAsync(ACCEPT_GRACE_MS + 10);
      const result = await pending;
      expect(cancel).not.toHaveBeenCalled();
      expect(result.status).toBe('cancelled');
    } finally {
      vi.useRealTimers();
    }
  });

  it('still ends as cancelled when Cancel fails', async () => {
    const { client, cancel } = liveClient();
    cancel.mockRejectedValue(new ConnectError('down', Code.Unavailable));
    const ac = new AbortController();
    const result = await runSession({ client, request, signal: ac.signal, onUpdate: (r) => r.executionId && ac.abort() });
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('cancelled');
  });

  it('does not call Cancel for a run that finished normally', async () => {
    const cancel = vi.fn();
    const client = clientWith(({ service }) =>
      service(ExecutionService, {
        async *run() {
          yield accepted();
          yield finished(2);
        },
        cancel,
      } as never)
    );
    const ac = new AbortController();
    await runSession({ client, request, signal: ac.signal });
    ac.abort(); // e.g. the component unmounts afterwards
    expect(cancel).not.toHaveBeenCalled();
  });
});
