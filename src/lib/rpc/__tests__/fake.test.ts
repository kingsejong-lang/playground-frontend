import { createClient } from '@connectrpc/connect';
import { ExecutionService, LanguageService } from '@kingsejong-lang/playground-proto';
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
