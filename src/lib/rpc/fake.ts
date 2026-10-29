/**
 * Development-only fake backend (createRouterTransport) so the UI can be seen
 * and exercised without the gateway.
 *
 * It is reachable only through `context.tsx`, behind
 *   process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_RPC_FAKE === '1'
 * Both values are inlined at build time, so `next build` drops the dynamic
 * import of this module and no production bundle contains it.
 *
 * Failure modes are chosen per request with the page's query string:
 *   ?fake=compile_error | runtime_error | timeout | memory | output_limit |
 *         queued | slow | internal | overloaded | rate_limited |
 *         unavailable | languages_error | no_templates | slow_boot
 *   Dropped Run streams (the run goes on; ResumeRun replays from a buffer):
 *         drop           resumed, every event replayed
 *         drop_gap       resumed, but the oldest missed events were evicted (ReplayGap)
 *         drop_noreplay  ResumeRun fails with REPLAY_UNAVAILABLE (falls back to GetExecution)
 *         drop_legacy    ResumeRun is not implemented (as on older servers)
 *   ?fake_user=1   start signed in
 *
 * Usage (dev):
 *   NEXT_PUBLIC_RPC_FAKE=1 npm run dev   # then open /ko?fake=compile_error
 */
import { create, type MessageInitShape } from '@bufbuild/protobuf';
import { Code, ConnectError, createRouterTransport, type Transport } from '@connectrpc/connect';
import {
  AuthService,
  Diagnostic_Severity,
  ErrorDetailSchema,
  ErrorDetail_Reason,
  ExecutionService,
  ExecutionStatus,
  LanguageService,
  Language_Capability,
  RunEventSchema,
  RunEvent_Phase,
  RunEvent_Stream,
  SettingsService,
  ShareService,
  Theme,
  type LanguageSchema,
  type RunEvent,
  type RunRequest,
  type SettingsSchema,
  type ShareSchema,
  type TemplateSchema,
  type UserSchema,
} from '@kingsejong-lang/playground-proto';

type LanguageInit = MessageInitShape<typeof LanguageSchema>;
type TemplateInit = MessageInitShape<typeof TemplateSchema>;
type ShareInit = MessageInitShape<typeof ShareSchema>;
type UserInit = MessageInitShape<typeof UserSchema>;
type SettingsInit = MessageInitShape<typeof SettingsSchema>;

type Init = NonNullable<Parameters<typeof create<typeof RunEventSchema>>[1]>['event'];

const enc = new TextEncoder();

/** Current failure mode from the page URL (read per request). */
export function fakeMode(): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('fake') ?? '';
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new ConnectError('cancelled', Code.Canceled));
    const t = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(t);
      reject(new ConnectError('cancelled', Code.Canceled));
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function detailError(code: Code, reason: ErrorDetail_Reason, retryAfterSeconds = 0): ConnectError {
  return new ConnectError('fake', code, undefined, [
    { desc: ErrorDetailSchema, value: { reason, retryAfterSeconds } },
  ]);
}

/** Same shape as a fetch() rejection, so errors.ts maps it to `unavailable`. */
function networkError(): ConnectError {
  return new ConnectError('Failed to fetch', Code.Unavailable, undefined, undefined, new TypeError('Failed to fetch'));
}

function guardUnavailable() {
  if (fakeMode() === 'unavailable') throw networkError();
}

const limits: NonNullable<LanguageInit['limits']> = {
  maxWallTimeMs: 10_000,
  maxCpuTimeMs: 5_000,
  maxMemoryBytes: 256n * 1024n * 1024n,
  maxOutputBytes: 64n * 1024n,
  maxConcurrentRuns: 1,
  runsPerMinute: 20,
};

const LANGUAGES: LanguageInit[] = [
  {
    id: 'kingsejong',
    displayName: '킹세종',
    version: '1.0',
    fileExtensions: ['.ksj'],
    defaultEntryFile: 'main.ksj',
    editorLanguage: 'kingsejong',
    defaultTemplateId: 'hello_world',
    capabilities: [Language_Capability.RUN, Language_Capability.STDIN, Language_Capability.FORMAT],
    limits,
  },
  {
    id: 'python',
    displayName: 'Python',
    version: '3.12',
    fileExtensions: ['.py'],
    defaultEntryFile: 'main.py',
    editorLanguage: 'python',
    defaultTemplateId: 'hello_world',
    capabilities: [Language_Capability.RUN, Language_Capability.STDIN],
    limits,
  },
  {
    id: 'go',
    displayName: 'Go',
    version: '1.22',
    fileExtensions: ['.go'],
    defaultEntryFile: 'main.go',
    editorLanguage: 'go',
    // Empty on purpose: the client falls back to "hello_world".
    defaultTemplateId: '',
    capabilities: [Language_Capability.RUN, Language_Capability.STDIN, Language_Capability.COMPILE, Language_Capability.FORMAT],
    limits,
  },
];

const TEMPLATE_CODE: Record<string, Record<string, { title: string; description: string; code: string }>> = {
  kingsejong: {
    hello_world: {
      title: '안녕, 세상',
      description: '화면에 인사말을 출력하는 가장 짧은 프로그램',
      code: '# 킹세종 플레이그라운드에 오신 것을 환영합니다\n출력("안녕하세요, 킹세종!")\n출력("한글로 쓰는 프로그래밍 언어")\n\n# 계산도 해 볼까요?\n결과 = 5 + 3\n출력("5 + 3 =", 결과)\n',
    },
    loops: {
      title: '반복문',
      description: '1부터 5까지 세며 구구단 한 줄을 출력합니다',
      code: '정수 i\ni가 1부터 5까지 {\n    출력("2 x", i, "=", 2 * i)\n}\n',
    },
    functions: {
      title: '함수',
      description: '함수를 정의하고 호출하는 방법',
      code: '인사 = 함수(이름) {\n    반환 "안녕하세요, " + 이름 + "님"\n}\n\n출력(인사("세종"))\n',
    },
  },
  python: {
    hello_world: {
      title: 'Hello, World',
      description: 'Print a greeting',
      code: 'print("안녕하세요, 세상!")\nprint("Hello, World!")\n\nresult = 5 + 3\nprint(f"5 + 3 = {result}")\n',
    },
    loops: {
      title: 'Loops',
      description: 'Count from 1 to 5',
      code: 'for i in range(1, 6):\n    print("2 x", i, "=", 2 * i)\n',
    },
  },
  go: {
    hello_world: {
      title: 'Hello, World',
      description: 'The smallest Go program',
      code: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("안녕하세요, 세상!")\n\tfmt.Println("Hello, World!")\n}\n',
    },
  },
};

function templatesFor(languageId: string): TemplateInit[] {
  return Object.entries(TEMPLATE_CODE[languageId] ?? {}).map(([id, t]) => ({
    id,
    languageId,
    title: t.title,
    description: t.description,
  }));
}

/**
 * Plausible stdout for the submitted program: the string literals passed to
 * 출력(...), print(...) or fmt.Println(...), one call per line.
 */
function fakeStdout(code: string): string[] {
  // Variables assigned simple sums/differences ("결과 = 5 + 3") print their value.
  const vars = new Map<string, number>();
  for (const m of code.matchAll(/^\s*([\p{L}_][\p{L}\p{N}_]*)\s*:?=\s*(-?\d+(?:\s*[+-]\s*\d+)*)\s*$/gmu)) {
    const total = [...m[2].matchAll(/([+-]?)\s*(\d+)/g)].reduce((sum, t) => sum + (t[1] === '-' ? -1 : 1) * Number(t[2]), 0);
    vars.set(m[1], total);
  }
  const lines: string[] = [];
  const call = /(?:출력|print|fmt\.Print(?:ln|f)?)\s*\(([^)]*)\)/g;
  for (const m of code.matchAll(call)) {
    // Split arguments on commas outside string literals.
    const args = (m[1].match(/f?"[^"]*"|[^,]+/g) ?? []).map((a) => a.trim()).filter(Boolean);
    const shown = args.map((a) => (/^f?"/.test(a) ? a.replace(/^f?"|"$/g, '').replace(/\\n/g, '') : vars.has(a) ? String(vars.get(a)) : a));
    lines.push(shown.join(' '));
  }
  return lines.length ? lines : ['(no output)'];
}

function ev(seq: number, event: Init): RunEvent {
  return create(RunEventSchema, { seq: BigInt(seq), event });
}

const EXEC_ID = 'exec_fake_0123456789abcdefgh';

async function* runEvents(req: RunRequest, signal: AbortSignal): AsyncGenerator<RunEvent> {
  const mode = fakeMode();
  if (mode === 'unavailable') throw networkError();
  if (mode === 'overloaded') throw detailError(Code.ResourceExhausted, ErrorDetail_Reason.OVERLOADED, 5);
  if (mode === 'rate_limited') throw detailError(Code.ResourceExhausted, ErrorDetail_Reason.RATE_LIMITED, 30);

  const entry = req.entryFile || req.files?.files[0]?.path || 'main.ksj';
  const code = req.files?.files.find((f) => f.path === entry)?.content ?? '';
  let seq = 0;
  const next = (event: Init) => ev(++seq, event);
  const out = (text: string, stream = RunEvent_Stream.STDOUT) =>
    next({ case: 'output', value: { stream, data: enc.encode(text) } });
  const finished = (status: ExecutionStatus, exitCode: number | undefined, wallTimeMs: number, message = '') =>
    next({
      case: 'finished',
      value: {
        status,
        exitCode,
        message,
        metrics: { wallTimeMs, cpuTimeMs: Math.round(wallTimeMs * 0.6), peakMemoryBytes: 3_400_000n, queueTimeMs: mode === 'queued' ? 1800 : 0 },
      },
    });

  await sleep(120, signal);
  yield next({ case: 'accepted', value: { executionId: EXEC_ID, limits } });

  if (mode === 'queued') {
    for (const position of [3, 2, 1]) {
      await sleep(600, signal);
      yield next({ case: 'queued', value: { position } });
    }
  }

  await sleep(250, signal);
  if (mode === 'compile_error') {
    yield next({ case: 'started', value: { phase: RunEvent_Phase.COMPILE } });
    await sleep(300, signal);
    yield next({
      case: 'diagnostic',
      value: { severity: Diagnostic_Severity.ERROR, message: "'출럭' 이라는 이름을 찾을 수 없습니다. '출력' 을 쓰려고 했나요?", path: entry, line: 2, column: 1, code: 'E0425' },
    });
    yield next({
      case: 'diagnostic',
      value: { severity: Diagnostic_Severity.WARNING, message: "변수 '결과' 가 선언만 되고 쓰이지 않았습니다", path: entry, line: 6, column: 1, code: 'W0101' },
    });
    yield finished(ExecutionStatus.COMPILE_ERROR, undefined, 412, '컴파일에 실패했습니다');
    return;
  }

  yield next({ case: 'started', value: { phase: RunEvent_Phase.RUN } });

  if (mode.startsWith('drop')) yield out('첫 줄은 도착했습니다\n');

  if (mode === 'slow') {
    for (let i = 1; ; i++) {
      await sleep(500, signal);
      yield out(`작업 ${i} 처리 중...\n`);
      if (i % 10 === 0) yield next({ case: 'heartbeat', value: {} });
    }
  }

  const lines = fakeStdout(code);
  // Echo program input so stdin can be checked without a backend.
  const input = req.stdin.length ? new TextDecoder().decode(req.stdin) : '';
  for (const line of input.split('\n').filter(Boolean)) lines.push(`입력: ${line}`);
  for (const line of lines) {
    await sleep(140, signal);
    yield out(`${line}\n`);
  }

  switch (mode) {
    case 'runtime_error':
      await sleep(150, signal);
      yield out(`오류: 0으로 나눌 수 없습니다\n  위치: ${entry}:7:9\n`, RunEvent_Stream.STDERR);
      yield finished(ExecutionStatus.FAILED, 1, 233);
      return;
    case 'timeout':
      await sleep(1200, signal);
      yield finished(ExecutionStatus.TIME_LIMIT_EXCEEDED, 137, 10_000, '실행 시간 제한(10초)을 넘었습니다');
      return;
    case 'memory':
      await sleep(500, signal);
      yield finished(ExecutionStatus.MEMORY_LIMIT_EXCEEDED, 137, 1_840, '메모리 제한(256 MB)을 넘었습니다');
      return;
    case 'output_limit':
      for (let i = 0; i < 40; i++) yield out(`${String(i + 1).padStart(3, '0')} ${'가나다라마바사 '.repeat(6)}\n`);
      yield next({ case: 'truncated', value: { stream: RunEvent_Stream.STDOUT, droppedBytes: 182_344n } });
      yield finished(ExecutionStatus.OUTPUT_LIMIT_EXCEEDED, 1, 960, '출력 제한(64 KB)을 넘었습니다');
      return;
    case 'internal':
      yield finished(ExecutionStatus.INTERNAL_ERROR, undefined, 50, '실행기에서 문제가 생겼습니다');
      return;
    default:
      yield finished(ExecutionStatus.SUCCEEDED, 0, 180 + lines.length * 140);
  }
}

/** Events of runs whose stream was dropped, kept for ResumeRun (the real server keeps 1 MiB for 5 minutes). */
interface ReplayBuffer {
  events: RunEvent[];
  done: boolean;
}
const replay = new Map<string, ReplayBuffer>();

/**
 * Streams a run until its first output line, then drops the connection the way
 * a failed fetch does. The run keeps going in the background into a buffer.
 */
async function* droppingRun(source: AsyncGenerator<RunEvent>): AsyncGenerator<RunEvent> {
  const buffer: ReplayBuffer = { events: [], done: false };
  // Pull events by hand: `for await ... break` would close the source and stop the run.
  for (let step = await source.next(); !step.done; step = await source.next()) {
    const ev = step.value;
    buffer.events.push(ev);
    if (ev.event.case === 'accepted') replay.set(ev.event.value.executionId, buffer);
    yield ev;
    if (ev.event.case === 'output') break;
  }
  void (async () => {
    for (let step = await source.next(); !step.done; step = await source.next()) buffer.events.push(step.value);
    buffer.done = true;
  })();
  await sleep(200);
  throw networkError();
}

/** Replays buffered events after `afterSeq`, then follows the run live until it ends. */
async function* replayEvents(buffer: ReplayBuffer, afterSeq: bigint, evictOldest: boolean): AsyncGenerator<RunEvent> {
  await sleep(150);
  let next = afterSeq + 1n;
  if (evictOldest) {
    // Pretend the two oldest missed events no longer fit in the buffer.
    next += 2n;
    yield create(RunEventSchema, { event: { case: 'replayGap', value: { firstAvailableSeq: next } } });
  }
  for (;;) {
    const pending = buffer.events.filter((e) => e.seq >= next);
    for (const ev of pending) {
      yield ev;
      next = ev.seq + 1n;
    }
    if (buffer.done && buffer.events.every((e) => e.seq < next)) return;
    await sleep(100);
  }
}

const shares = new Map<string, ShareInit>();
let user: UserInit | null =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('fake_user') === '1'
    ? { id: 'u_1', email: 'sejong@example.com', displayName: '세종' }
    : null;
let settings: SettingsInit = { fontSize: 14, tabSize: 2, minimap: true, theme: Theme.DARK };

function demoShare(id: string): ShareInit {
  return {
    id,
    languageId: 'kingsejong',
    entryFile: 'main.ksj',
    title: '킹세종 Code',
    files: { files: [{ path: 'main.ksj', content: TEMPLATE_CODE.kingsejong.hello_world.code }] },
  };
}

export function createFakeTransport(): Transport {
  return createRouterTransport(({ service }) => {
    service(LanguageService, {
      async listLanguages() {
        await sleep(fakeMode() === 'slow_boot' ? 4000 : 250);
        guardUnavailable();
        if (fakeMode() === 'languages_error') throw detailError(Code.Internal, ErrorDetail_Reason.INTERNAL);
        return { languages: LANGUAGES };
      },
      async getLanguage(req) {
        guardUnavailable();
        const language = LANGUAGES.find((l) => l.id === req.languageId);
        if (!language) throw detailError(Code.NotFound, ErrorDetail_Reason.NOT_FOUND);
        return { language };
      },
      async listTemplates(req) {
        await sleep(300);
        guardUnavailable();
        return { templates: fakeMode() === 'no_templates' ? [] : templatesFor(req.languageId) };
      },
      async getTemplate(req) {
        await sleep(150);
        guardUnavailable();
        const t = TEMPLATE_CODE[req.languageId]?.[req.templateId];
        if (!t) throw detailError(Code.NotFound, ErrorDetail_Reason.NOT_FOUND);
        const lang = LANGUAGES.find((l) => l.id === req.languageId);
        const path = lang?.defaultEntryFile ?? 'main.txt';
        return { template: { id: req.templateId, languageId: req.languageId, title: t.title, description: t.description, entryFile: path, files: { files: [{ path, content: t.code }] } } };
      },
      async formatCode(req) {
        await sleep(200);
        guardUnavailable();
        const content = (req.file?.content ?? '').replace(/[ \t]+$/gm, '').replace(/\n*$/, '\n');
        return { file: { path: req.file?.path ?? '', content }, diagnostics: [] };
      },
    });

    service(ExecutionService, {
      run(req, ctx) {
        const mode = fakeMode();
        if (!mode.startsWith('drop')) return runEvents(req, ctx.signal);
        return droppingRun(runEvents(req, new AbortController().signal));
      },
      resumeRun(req) {
        const mode = fakeMode();
        if (mode === 'drop_legacy') throw new ConnectError('ResumeRun is not implemented', Code.Unimplemented);
        if (mode === 'drop_noreplay' || !replay.has(req.executionId)) throw detailError(Code.FailedPrecondition, ErrorDetail_Reason.REPLAY_UNAVAILABLE);
        return replayEvents(replay.get(req.executionId)!, req.afterSeq, mode === 'drop_gap');
      },
      async cancel() {
        return { cancelled: true };
      },
      async getExecution(req) {
        await sleep(100);
        return { executionId: req.executionId, languageId: 'kingsejong', status: ExecutionStatus.SUCCEEDED, exitCode: 0, metrics: { wallTimeMs: 640, peakMemoryBytes: 3_100_000n } };
      },
    });

    service(ShareService, {
      async createShare(req) {
        await sleep(400);
        guardUnavailable();
        const id = `s${Math.random().toString(36).slice(2, 12).padEnd(10, '0')}`;
        const share: ShareInit = { id, languageId: req.languageId, files: req.files, entryFile: req.entryFile, title: req.title, description: req.description };
        shares.set(id, share);
        return { share, deleteToken: 'fake-delete-token' };
      },
      async getShare(req) {
        await sleep(300);
        guardUnavailable();
        if (req.id === 'notfound00') throw detailError(Code.NotFound, ErrorDetail_Reason.NOT_FOUND);
        return { share: shares.get(req.id) ?? demoShare(req.id) };
      },
      async deleteShare(req) {
        shares.delete(req.id);
        return {};
      },
    });

    service(AuthService, {
      async getSession() {
        await sleep(100);
        guardUnavailable();
        if (!user) throw detailError(Code.Unauthenticated, ErrorDetail_Reason.UNAUTHENTICATED);
        return { user };
      },
      async login(req) {
        await sleep(400);
        guardUnavailable();
        if (req.email.startsWith('fail')) throw detailError(Code.Unauthenticated, ErrorDetail_Reason.UNAUTHENTICATED);
        user = { id: 'u_1', email: req.email, displayName: req.email.split('@')[0] };
        return { user };
      },
      async register(req) {
        await sleep(500);
        guardUnavailable();
        user = { id: 'u_1', email: req.email, displayName: req.displayName };
        return { user };
      },
      async logout() {
        user = null;
        return {};
      },
      async refreshSession() {
        if (!user) throw detailError(Code.Unauthenticated, ErrorDetail_Reason.UNAUTHENTICATED);
        return { user };
      },
    });

    service(SettingsService, {
      async getSettings() {
        guardUnavailable();
        return { settings };
      },
      async updateSettings(req) {
        guardUnavailable();
        if (req.settings) {
          const { fontSize, tabSize, fontFamily, minimap, autoSave, theme } = req.settings;
          settings = { ...settings, fontSize, tabSize, fontFamily, minimap, autoSave, theme };
        }
        return { settings };
      },
    });
  });
}
