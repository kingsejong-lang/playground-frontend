import { Code, ConnectError, createRouterTransport } from '@connectrpc/connect';
import { LanguageService } from '@kingsejong-lang/playground-proto';
import { decodeInitialLanguages } from '../initial';
import { CACHE_TTL_MS, FAILURE_TTL_MS, fetchInitialLanguages, loadInitialLanguages, resetInitialLanguagesCache, serverApiBaseUrl } from '../server';

const LANGS = [
  { id: 'python', displayName: 'Python', limits: { maxMemoryBytes: 256n * 1024n * 1024n } },
  { id: 'kingsejong', displayName: '킹세종', defaultTemplateId: 'hello_world' },
];
const choose = () => ({ languageId: 'kingsejong', templateId: 'hello_world' });

function transport(overrides: Record<string, (...a: never[]) => unknown> = {}) {
  const calls = { listLanguages: 0, getTemplate: 0 };
  const t = createRouterTransport(({ service }) =>
    service(LanguageService, {
      listLanguages: () => {
        calls.listLanguages++;
        return { languages: LANGS };
      },
      getTemplate: () => {
        calls.getTemplate++;
        return { template: { entryFile: 'main.ksj', files: { files: [{ path: 'main.ksj', content: '출력(1)' }] } } };
      },
      ...overrides,
    } as never)
  );
  return { t, calls };
}

beforeEach(() => resetInitialLanguagesCache());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('fetchInitialLanguages', () => {
  it('returns the list (64-bit fields intact) and the starter template', async () => {
    const { t } = transport();
    const payload = await fetchInitialLanguages(t, choose);
    const decoded = decodeInitialLanguages(payload)!;
    expect(decoded.languages.map((l) => l.id)).toEqual(['python', 'kingsejong']);
    expect(decoded.languages[0].limits?.maxMemoryBytes).toBe(268435456n);
    expect(decoded.starter).toEqual({ languageId: 'kingsejong', entryFile: 'main.ksj', files: [{ path: 'main.ksj', content: '출력(1)' }] });
  });

  it('still returns the list when the template fails', async () => {
    const { t } = transport({
      getTemplate: () => {
        throw new ConnectError('gone', Code.NotFound);
      },
    });
    const payload = await fetchInitialLanguages(t, choose);
    expect(payload.starter).toBeUndefined();
    expect(decodeInitialLanguages(payload)?.languages).toHaveLength(2);
  });

  it('gives up after the time budget', async () => {
    const { t } = transport({ listLanguages: () => new Promise(() => {}) });
    await expect(fetchInitialLanguages(t, choose, 20)).rejects.toThrow();
  });
});

describe('loadInitialLanguages', () => {
  it('caches a success for a minute', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const { t, calls } = transport();
    const first = await loadInitialLanguages(choose, { transport: t });
    expect(await loadInitialLanguages(choose, { transport: t })).toBe(first);
    expect(calls.listLanguages).toBe(1);
    vi.setSystemTime(Date.now() + CACHE_TTL_MS + 1);
    await loadInitialLanguages(choose, { transport: t });
    expect(calls.listLanguages).toBe(2);
  });

  it('returns null on failure and retries only after a short pause', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    let fail = true;
    const { t } = transport({
      listLanguages: () => {
        if (fail) throw new ConnectError('down', Code.Unavailable);
        return { languages: LANGS };
      },
    });
    expect(await loadInitialLanguages(choose, { transport: t })).toBeNull();
    fail = false;
    expect(await loadInitialLanguages(choose, { transport: t })).toBeNull();
    vi.setSystemTime(Date.now() + FAILURE_TTL_MS + 1);
    expect(await loadInitialLanguages(choose, { transport: t })).not.toBeNull();
  });

  it('shares one request between concurrent page renders', async () => {
    const { t, calls } = transport();
    await Promise.all([loadInitialLanguages(choose, { transport: t }), loadInitialLanguages(choose, { transport: t })]);
    expect(calls.listLanguages).toBe(1);
  });
});

describe('serverApiBaseUrl', () => {
  it('prefers the internal URL, then the public one', () => {
    vi.stubEnv('PLAYGROUND_API_INTERNAL_URL', '');
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example');
    expect(serverApiBaseUrl()).toBe('https://api.example');
    vi.stubEnv('PLAYGROUND_API_INTERNAL_URL', 'http://gateway:8080');
    expect(serverApiBaseUrl()).toBe('http://gateway:8080');
  });
});

describe('decodeInitialLanguages', () => {
  it('ignores missing, unreadable or empty payloads', () => {
    expect(decodeInitialLanguages(null)).toBeNull();
    expect(decodeInitialLanguages({ languages: '!!not base64' })).toBeNull();
    expect(decodeInitialLanguages({ languages: '' })).toBeNull();
  });
});

describe('development fake backend', () => {
  it('skips the server request so the fake data is used', async () => {
    vi.stubEnv('NEXT_PUBLIC_RPC_FAKE', '1');
    const { t, calls } = transport();
    expect(await loadInitialLanguages(choose, { transport: t })).toBeNull();
    expect(calls.listLanguages).toBe(0);
  });
});
