import { createClient } from '@connectrpc/connect';
import { LanguageService } from '@kingsejong-lang/playground-proto';
import { createApiTransport } from '../transport';

describe('createApiTransport', () => {
  it('sends binary Connect requests with cookies and the protocol header', async () => {
    const seen: { url: string; init: RequestInit }[] = [];
    const fakeFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      seen.push({ url: String(input), init: init ?? {} });
      return new Response(new Uint8Array(), { status: 200, headers: { 'content-type': 'application/proto' } });
    };
    const client = createClient(LanguageService, createApiTransport({ baseUrl: 'https://api.example.test', fetch: fakeFetch }));
    await client.listLanguages({});

    expect(seen).toHaveLength(1);
    const { url, init } = seen[0];
    expect(url).toBe('https://api.example.test/playground.api.v1.LanguageService/ListLanguages');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    const headers = new Headers(init.headers);
    expect(headers.get('content-type')).toBe('application/proto');
    expect(headers.get('connect-protocol-version')).toBe('1');
    expect(headers.get('authorization')).toBeNull();
  });
});
