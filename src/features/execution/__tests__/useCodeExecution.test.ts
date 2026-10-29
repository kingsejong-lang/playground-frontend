import { create } from '@bufbuild/protobuf';
import { Code, ConnectError } from '@connectrpc/connect';
import { act, renderHook, waitFor } from '@testing-library/react';
import { ErrorDetailSchema, ErrorDetail_Reason, ExecutionService, ExecutionStatus, LanguageSchema } from '@kingsejong-lang/playground-proto';
import { rpcWrapper } from '@/test/rpc';
import { newClientRequestId, useCodeExecution } from '../useCodeExecution';

const enc = new TextEncoder();
const languages = [create(LanguageSchema, { id: 'kingsejong', displayName: 'KingSejong', fileExtensions: ['.ksj'], defaultEntryFile: 'main.ksj' })];

function setup(run: (req: unknown, ctx: { signal: AbortSignal }) => AsyncIterable<unknown>) {
  const runSpy = vi.fn(run);
  const { wrapper } = rpcWrapper(({ service }) => service(ExecutionService, { run: runSpy } as never));
  return { ...renderHook(() => useCodeExecution(), { wrapper }), runSpy };
}

describe('useCodeExecution', () => {
  it('streams a run and ends with the final result', async () => {
    const { result, runSpy } = setup(async function* () {
      yield { seq: 1n, event: { case: 'accepted', value: { executionId: 'exec_0123456789abcdefghijkl' } } };
      yield { seq: 2n, event: { case: 'output', value: { stream: 1, data: enc.encode('안녕\n') } } };
      yield { seq: 3n, event: { case: 'finished', value: { status: ExecutionStatus.SUCCEEDED, exitCode: 0 } } };
    });
    await act(() => result.current.execute('출력("안녕")', 'kingsejong', languages));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.output?.success).toBe(true);
    expect(result.current.output?.chunks).toEqual([{ stream: 'stdout', text: '안녕\n' }]);
    const req = runSpy.mock.calls[0][0] as { files: { files: { path: string }[] }; entryFile: string; clientRequestId: string };
    expect(req.files.files[0].path).toBe('main.ksj');
    expect(req.entryFile).toBe('main.ksj');
    expect(req.clientRequestId).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
  });

  it('shows retry_after for a rate-limited run', async () => {
    const { result } = setup(
      async function* () {
        throw new ConnectError('slow down', Code.ResourceExhausted, undefined, [
          { desc: ErrorDetailSchema, value: create(ErrorDetailSchema, { reason: ErrorDetail_Reason.RATE_LIMITED, retryAfterSeconds: 30 }) },
        ]);
      },
    );
    await act(() => result.current.execute('출력(1)', 'kingsejong', languages));
    expect(result.current.error).toMatch(/Try again in 30 s/);
    expect(result.current.output).toBeNull();
  });

  it('rejects invalid input without calling the server', async () => {
    const { result, runSpy } = setup(async function* () {});
    const big = 'a'.repeat(300 * 1024);
    await act(() => result.current.execute(big, 'kingsejong', languages));
    expect(result.current.error).toMatch(/65536 bytes/);
    expect(runSpy).not.toHaveBeenCalled();
  });

  it('requires code and a known language', async () => {
    const { result } = setup(async function* () {});
    await act(() => result.current.execute('   ', 'kingsejong', languages));
    expect(result.current.error).toBe('Please write some code first');
    await act(() => result.current.execute('x', 'nope', languages));
    expect(result.current.error).toBe('Language not found');
  });

  it('cancel() aborts the stream', async () => {
    const { result } = setup(async function* (_req, ctx) {
      yield { seq: 1n, event: { case: 'accepted', value: { executionId: 'exec_0123456789abcdefghijkl' } } };
      await new Promise<void>((resolve) => {
        ctx.signal.addEventListener('abort', () => resolve());
      });
    });
    let done: Promise<unknown> = Promise.resolve();
    act(() => {
      done = result.current.execute('출력(1)', 'kingsejong', languages);
    });
    await waitFor(() => expect(result.current.loading).toBe(true));
    await act(async () => {
      result.current.cancel();
      await done;
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.output?.status).toBe('cancelled');
  });

  it('generates idempotency keys in the contract alphabet', () => {
    expect(newClientRequestId()).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });

  it('runs every workspace file with the chosen entry file', async () => {
    const { result, runSpy } = setup(async function* () {
      yield { seq: 1n, event: { case: 'finished', value: { status: ExecutionStatus.SUCCEEDED, exitCode: 0 } } };
    });
    const files = [
      { name: 'main.ksj', content: '출력(1)' },
      { name: 'util.ksj', content: '출력(2)' },
    ];
    await act(() => result.current.runWorkspace(files, { preferred: 'util.ksj' }, 'kingsejong', languages));
    const req = runSpy.mock.calls[0][0] as { files: { files: { path: string }[] }; entryFile: string };
    expect(req.files.files.map((f) => f.path)).toEqual(['main.ksj', 'util.ksj']);
    expect(req.entryFile).toBe('util.ksj');
  });

  it("defaults the entry to the language's defaultEntryFile, else the first file", async () => {
    const { result, runSpy } = setup(async function* () {
      yield { seq: 1n, event: { case: 'finished', value: { status: ExecutionStatus.SUCCEEDED, exitCode: 0 } } };
    });
    await act(() =>
      result.current.runWorkspace(
        [
          { name: 'a.ksj', content: 'x' },
          { name: 'main.ksj', content: 'y' },
        ],
        {},
        'kingsejong',
        languages
      )
    );
    expect((runSpy.mock.calls[0][0] as { entryFile: string }).entryFile).toBe('main.ksj');
    await act(() => result.current.runWorkspace([{ name: 'z.ksj', content: 'x' }], { preferred: 'gone.ksj' }, 'kingsejong', languages));
    expect((runSpy.mock.calls[1][0] as { entryFile: string }).entryFile).toBe('z.ksj');
  });

  it('sends program input as UTF-8 stdin', async () => {
    const { result, runSpy } = setup(async function* () {
      yield { seq: 1n, event: { case: 'finished', value: { status: ExecutionStatus.SUCCEEDED, exitCode: 0 } } };
    });
    await act(() => result.current.runWorkspace([{ name: 'main.ksj', content: 'x' }], {}, 'kingsejong', languages, '세종\n42\n'));
    const req = runSpy.mock.calls[0][0] as { stdin: Uint8Array };
    expect(new TextDecoder().decode(req.stdin)).toBe('세종\n42\n');
  });

  it('rejects stdin over the 64 KiB limit without calling the server', async () => {
    const { result, runSpy } = setup(async function* () {});
    await act(() => result.current.runWorkspace([{ name: 'main.ksj', content: 'x' }], {}, 'kingsejong', languages, 'a'.repeat(70 * 1024)));
    expect(runSpy).not.toHaveBeenCalled();
    expect(result.current.error).toMatch(/stdin/);
  });
});

describe('useCodeExecution without a language list', () => {
  const finished = async function* () {
    yield { seq: 1n, event: { case: 'finished', value: { status: ExecutionStatus.SUCCEEDED, exitCode: 0 } } };
  };

  it('still sends the run when the list never loaded, with a guessed file name', async () => {
    const { result, runSpy } = setup(finished);
    await act(() => result.current.execute('print(1)', 'python_3', []));
    await act(() => result.current.execute('x', 'cobol', []));
    const paths = runSpy.mock.calls.map((c) => (c[0] as { entryFile: string }).entryFile);
    expect(paths).toEqual(['main.py', 'main.txt']);
  });

  it('runWorkspace uses the first file without a list and refuses unknown languages with one', async () => {
    const { result, runSpy } = setup(finished);
    await act(() => result.current.runWorkspace([{ name: 'a.go', content: 'package main' }, { name: 'b.go', content: '' }], {}, 'go', []));
    expect((runSpy.mock.calls[0][0] as { entryFile: string }).entryFile).toBe('a.go');
    await act(() => result.current.runWorkspace([{ name: 'a.go', content: 'x' }], {}, 'go', languages));
    expect(result.current.error).toBe('Language not found');
    await act(() => result.current.runWorkspace([{ name: 'main.ksj', content: '  ' }], {}, 'kingsejong', languages));
    expect(result.current.error).toBe('Please write some code first');
    expect(runSpy).toHaveBeenCalledTimes(1);
  });
});

describe('useCodeExecution live state', () => {
  it('reports streaming once accepted, and reset() discards the run', async () => {
    const { result } = setup(async function* (_req, ctx) {
      yield { seq: 1n, event: { case: 'accepted', value: { executionId: 'exec_0123456789abcdefghijkl' } } };
      yield { seq: 2n, event: { case: 'output', value: { stream: 1, data: enc.encode('partial\n') } } };
      await new Promise<void>((resolve) => ctx.signal.addEventListener('abort', () => resolve()));
    });
    let done: Promise<unknown> = Promise.resolve();
    act(() => {
      done = result.current.execute('출력(1)', 'kingsejong', languages);
    });
    await waitFor(() => expect(result.current.streaming).toBe(true));
    expect(result.current.output?.chunks).toEqual([{ stream: 'stdout', text: 'partial\n' }]);
    await act(async () => {
      result.current.reset();
      await done;
    });
    expect(result.current.output).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.streaming).toBe(false);
  });

  it('a new run replaces one still in flight', async () => {
    let calls = 0;
    const { result } = setup(async function* (_req, ctx) {
      calls++;
      if (calls === 1) {
        yield { seq: 1n, event: { case: 'accepted', value: { executionId: 'exec_first_0123456789abcd' } } };
        await new Promise<void>((resolve) => ctx.signal.addEventListener('abort', () => resolve()));
        return;
      }
      yield { seq: 1n, event: { case: 'output', value: { stream: 1, data: enc.encode('second\n') } } };
      yield { seq: 2n, event: { case: 'finished', value: { status: ExecutionStatus.SUCCEEDED, exitCode: 0 } } };
    });
    let first: Promise<unknown> = Promise.resolve();
    act(() => {
      first = result.current.execute('출력(1)', 'kingsejong', languages);
    });
    await waitFor(() => expect(result.current.loading).toBe(true));
    await act(async () => {
      await result.current.execute('출력(2)', 'kingsejong', languages);
      await first;
    });
    expect(result.current.output?.chunks).toEqual([{ stream: 'stdout', text: 'second\n' }]);
    expect(result.current.output?.status).toBe('succeeded');
  });
});

describe('useCodeExecution Stop', () => {
  it('cancel() asks the server to stop the run, not only closes the stream', async () => {
    const cancelRpc = vi.fn(() => ({ cancelled: true }));
    const { wrapper } = rpcWrapper(({ service }) =>
      service(ExecutionService, {
        async *run(_req: unknown, ctx: { signal: AbortSignal }) {
          yield { seq: 1n, event: { case: 'accepted', value: { executionId: 'exec_0123456789abcdefghijkl' } } };
          await new Promise<void>((resolve) => ctx.signal.addEventListener('abort', () => resolve()));
        },
        cancel: cancelRpc,
      } as never)
    );
    const { result } = renderHook(() => useCodeExecution(), { wrapper });
    let done: Promise<unknown> = Promise.resolve();
    act(() => {
      done = result.current.execute('출력(1)', 'kingsejong', languages);
    });
    await waitFor(() => expect(result.current.streaming).toBe(true));
    await act(async () => {
      result.current.cancel();
      await done;
    });
    expect(cancelRpc).toHaveBeenCalledWith(expect.objectContaining({ executionId: 'exec_0123456789abcdefghijkl' }), expect.anything());
    expect(result.current.output?.status).toBe('cancelled');
  });
});
