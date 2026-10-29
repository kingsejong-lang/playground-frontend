import { createClient } from '@connectrpc/connect';
import { AuthService, ExecutionService, LanguageService, SettingsService, ShareService } from '@kingsejong-lang/playground-proto';
import { createFakeTransport } from '../fake';
import { runSession } from '../run-stream';
import { toRpcFailure } from '../errors';

function setMode(mode: string) {
  window.history.replaceState(null, '', mode ? `/?fake=${mode}` : '/');
}

describe('fake transport (development only)', () => {
  afterEach(() => setMode(''));

  it('lists the three languages with a default template id', async () => {
    const client = createClient(LanguageService, createFakeTransport());
    const { languages } = await client.listLanguages({});
    expect(languages.map((l) => l.id)).toEqual(['kingsejong', 'python', 'go']);
    expect(languages[0].defaultTemplateId).toBe('hello_world');
  });

  it('streams a successful run with the printed lines', async () => {
    const client = createClient(ExecutionService, createFakeTransport());
    const result = await runSession({
      client,
      request: { languageId: 'kingsejong', entryFile: 'main.ksj', files: { files: [{ path: 'main.ksj', content: '출력("안녕")' }] } },
      signal: new AbortController().signal,
    });
    expect(result.status).toBe('succeeded');
    expect(result.chunks.map((c) => c.text).join('')).toContain('안녕');
  });

  it('reports compile diagnostics in compile_error mode', async () => {
    setMode('compile_error');
    const client = createClient(ExecutionService, createFakeTransport());
    const result = await runSession({
      client,
      request: { languageId: 'kingsejong', entryFile: 'main.ksj', files: { files: [{ path: 'main.ksj', content: 'x' }] } },
      signal: new AbortController().signal,
    });
    expect(result.status).toBe('compile_error');
    expect(result.diagnostics[0]).toMatchObject({ path: 'main.ksj', line: 2, severity: 'error' });
  });

  it('maps unavailable mode to the backend-unavailable failure', async () => {
    setMode('unavailable');
    const client = createClient(LanguageService, createFakeTransport());
    await expect(client.listLanguages({})).rejects.toSatisfy((e) => toRpcFailure(e).kind === 'unavailable');
  });
});

describe('fake transport failure modes', () => {
  // The fake backend paces its responses with setTimeout; drive them with fake timers.
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    setMode('');
  });

  async function settle<T>(promise: Promise<T>): Promise<T> {
    let done = false;
    const tracked = promise.finally(() => {
      done = true;
    });
    tracked.catch(() => {});
    while (!done) await vi.advanceTimersByTimeAsync(500);
    return tracked;
  }

  function run(mode: string, content = '출력("안녕")', extra: Record<string, unknown> = {}) {
    setMode(mode);
    const client = createClient(ExecutionService, createFakeTransport());
    return settle(
      runSession({
        client,
        request: { languageId: 'kingsejong', entryFile: 'main.ksj', files: { files: [{ path: 'main.ksj', content }] }, ...extra },
        signal: new AbortController().signal,
        reconnectDelaysMs: [],
      })
    );
  }

  it.each([
    ['runtime_error', 'failed'],
    ['timeout', 'time_limit_exceeded'],
    ['memory', 'memory_limit_exceeded'],
    ['output_limit', 'output_limit_exceeded'],
    ['internal', 'internal_error'],
    ['queued', 'succeeded'],
  ])('%s ends with status %s', async (mode, status) => {
    const result = await run(mode);
    expect(result.status).toBe(status);
    if (mode === 'output_limit') expect(result.truncated[0]).toEqual({ stream: 'stdout', droppedBytes: 182_344 });
    if (mode === 'runtime_error') expect(result.chunks.some((c) => c.stream === 'stderr' && c.text.includes('main.ksj:7:9'))).toBe(true);
    if (mode === 'queued') expect(result.metrics?.queueTimeMs).toBe(1800);
  });

  it('prints literals, evaluated sums and echoed stdin', async () => {
    const result = await run('', '결과 = 5 + 3 - 1\n출력("합:", 결과)\nprint(f"x")', { stdin: new TextEncoder().encode('7\n') });
    expect(result.chunks.map((c) => c.text).join('')).toBe('합: 7\nx\n입력: 7\n');
    const silent = await run('', '# nothing');
    expect(silent.chunks.map((c) => c.text).join('')).toBe('(no output)\n');
  });

  it('rejects runs when overloaded or rate limited, with a retry hint', async () => {
    for (const [mode, reason, seconds] of [
      ['overloaded', 'overloaded', 5],
      ['rate_limited', 'rate_limited', 30],
    ] as const) {
      setMode(mode);
      const client = createClient(ExecutionService, createFakeTransport());
      const error = await runSession({
        client,
        request: { languageId: 'kingsejong', files: { files: [{ path: 'main.ksj', content: 'x' }] } },
        signal: new AbortController().signal,
      }).catch((e: unknown) => e);
      expect(toRpcFailure(error)).toMatchObject({ kind: reason, retryAfterSeconds: seconds });
    }
  });

  it('stops a slow run when the caller aborts', async () => {
    setMode('slow');
    const client = createClient(ExecutionService, createFakeTransport());
    const controller = new AbortController();
    const updates: number[] = [];
    const pending = runSession({
      client,
      request: { languageId: 'kingsejong', files: { files: [{ path: 'main.ksj', content: 'x' }] } },
      signal: controller.signal,
      onUpdate: (r) => updates.push(r.chunks.map((c) => c.text).join('').split('\n').length - 1),
    }).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(6000);
    controller.abort();
    await settle(pending);
    expect(Math.max(...updates)).toBeGreaterThanOrEqual(10);
  });

  it('serves templates, formatting and errors for unknown ids', async () => {
    const client = createClient(LanguageService, createFakeTransport());
    const { templates } = await settle(client.listTemplates({ languageId: 'python' }));
    expect(templates.map((t) => t.id)).toEqual(['hello_world', 'loops']);
    const { template } = await settle(client.getTemplate({ languageId: 'go', templateId: 'hello_world' }));
    expect(template?.files?.files[0].path).toBe('main.go');
    await expect(settle(client.getTemplate({ languageId: 'go', templateId: 'nope' }))).rejects.toSatisfy((e) => toRpcFailure(e).kind === 'not_found');
    await expect(client.getLanguage({ languageId: 'cobol' })).rejects.toSatisfy((e) => toRpcFailure(e).kind === 'not_found');
    const { file } = await settle(client.formatCode({ languageId: 'kingsejong', file: { path: 'a.ksj', content: 'x  \n\n\n' } }));
    expect(file?.content).toBe('x\n');
    setMode('no_templates');
    expect((await settle(client.listTemplates({ languageId: 'python' }))).templates).toEqual([]);
    setMode('languages_error');
    await expect(settle(client.listLanguages({}))).rejects.toSatisfy((e) => toRpcFailure(e).kind === 'internal');
  });

  it('keeps shares, sessions and settings in memory', async () => {
    const transport = createFakeTransport();
    const share = createClient(ShareService, transport);
    const created = await settle(share.createShare({ languageId: 'go', entryFile: 'main.go', files: { files: [{ path: 'main.go', content: 'package main' }] } }));
    const id = created.share!.id;
    expect((await settle(share.getShare({ id }))).share?.languageId).toBe('go');
    await share.deleteShare({ id, deleteToken: created.deleteToken });
    expect((await settle(share.getShare({ id }))).share?.languageId).toBe('kingsejong');
    await expect(settle(share.getShare({ id: 'notfound00' }))).rejects.toSatisfy((e) => toRpcFailure(e).kind === 'not_found');

    const auth = createClient(AuthService, transport);
    await expect(settle(auth.login({ email: 'fail@example.com', password: 'x' }))).rejects.toSatisfy((e) => toRpcFailure(e).kind === 'unauthenticated');
    expect((await settle(auth.login({ email: 'kim@example.com', password: 'x' }))).user?.displayName).toBe('kim');
    expect((await settle(auth.getSession({}))).user?.email).toBe('kim@example.com');
    expect((await auth.refreshSession({})).user?.email).toBe('kim@example.com');
    await auth.logout({});
    await expect(settle(auth.getSession({}))).rejects.toSatisfy((e) => toRpcFailure(e).kind === 'unauthenticated');
    await expect(auth.refreshSession({})).rejects.toSatisfy((e) => toRpcFailure(e).kind === 'unauthenticated');
    expect((await settle(auth.register({ email: 'lee@example.com', password: 'x', displayName: '이' }))).user?.displayName).toBe('이');

    const settings = createClient(SettingsService, transport);
    await settings.updateSettings({ settings: { fontSize: 18, tabSize: 4, minimap: false } });
    expect((await settings.getSettings({})).settings).toMatchObject({ fontSize: 18, tabSize: 4, minimap: false });
    const exec = createClient(ExecutionService, transport);
    expect((await exec.cancel({ executionId: 'x' })).cancelled).toBe(true);
    expect((await settle(exec.getExecution({ executionId: 'x' }))).executionId).toBe('x');
  });
});

describe('fake transport dropped streams and replay', () => {
  afterEach(() => setMode(''));

  async function dropRun(mode: string) {
    setMode(mode);
    const client = createClient(ExecutionService, createFakeTransport());
    return runSession({
      client,
      request: { languageId: 'kingsejong', entryFile: 'main.ksj', files: { files: [{ path: 'main.ksj', content: '출력("하나")\n출력("둘")' }] } },
      signal: new AbortController().signal,
      reconnectDelaysMs: [50, 50, 50],
    });
  }

  it('drop: resumes and replays every missed line', async () => {
    const result = await dropRun('drop');
    expect(result).toMatchObject({ status: 'succeeded', resumed: true, gaps: 0 });
    expect(result.replayGap).toBeUndefined();
    expect(result.chunks.map((c) => c.text).join('')).toBe('첫 줄은 도착했습니다\n하나\n둘\n');
  });

  it('drop_gap: reports the events the server no longer had', async () => {
    const result = await dropRun('drop_gap');
    expect(result).toMatchObject({ status: 'succeeded', resumed: true, replayGap: 2 });
    expect(result.chunks.map((c) => c.text).join('')).toBe('첫 줄은 도착했습니다\n');
  });

  it.each(['drop_noreplay', 'drop_legacy'])('%s: falls back to the final status from GetExecution', async (mode) => {
    const result = await dropRun(mode);
    expect(result).toMatchObject({ status: 'succeeded', reconnected: true });
    expect(result.resumed).toBeUndefined();
  });
});
