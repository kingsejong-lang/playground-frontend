/**
 * The request proxy: locale routing plus a fresh CSP nonce per request.
 */
import { NextRequest } from 'next/server';
import proxy, { config } from '../proxy';

const nonceOf = (csp: string | null) => /'nonce-([^']+)'/.exec(csp ?? '')?.[1];

describe('proxy', () => {
  it('redirects the bare path to a locale and still sets security headers', () => {
    const res = proxy(new NextRequest('http://localhost:3000/'));
    expect([307, 308]).toContain(res.status);
    expect(res.headers.get('location')).toMatch(/\/(ko|en)$/);
    expect(res.headers.get('Content-Security-Policy')).toContain("script-src 'self' 'nonce-");
  });

  it('issues a different nonce on every request', () => {
    const a = proxy(new NextRequest('http://localhost:3000/ko'));
    const b = proxy(new NextRequest('http://localhost:3000/ko'));
    expect(nonceOf(a.headers.get('Content-Security-Policy'))).toBeTruthy();
    expect(nonceOf(a.headers.get('Content-Security-Policy'))).not.toBe(nonceOf(b.headers.get('Content-Security-Policy')));
  });

  it('forbids framing for the playground but allows it for embeds', () => {
    const page = proxy(new NextRequest('http://localhost:3000/en'));
    const embed = proxy(new NextRequest('http://localhost:3000/en/embed/abc'));
    expect(page.headers.get('Content-Security-Policy')).toContain("frame-ancestors 'none'");
    expect(embed.headers.get('Content-Security-Policy')).not.toContain("frame-ancestors 'none'");
  });

  it('skips static assets and Next internals', () => {
    const source = new RegExp(`^${config.matcher[0].source}$`);
    expect(source.test('/ko')).toBe(true);
    expect(source.test('/_next/static/chunk.js')).toBe(false);
    expect(source.test('/favicon.ico')).toBe(false);
  });
});
