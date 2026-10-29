import { buildCsp, generateNonce, isEmbedPath, routeSecurityHeaders } from '../csp';

const base = { nonce: 'abc123', apiOrigin: 'https://api.example.com/some/path', embed: false };
const directive = (csp: string, name: string) => csp.split('; ').find((d) => d.startsWith(`${name} `)) ?? '';

describe('buildCsp', () => {
  it('uses a nonce and strict-dynamic without eval/inline scripts in production', () => {
    const scripts = directive(buildCsp({ ...base, isDev: false }), 'script-src');
    expect(scripts).toContain("'nonce-abc123'");
    expect(scripts).toContain("'strict-dynamic'");
    expect(scripts).not.toContain("'unsafe-eval'");
    expect(scripts).not.toContain("'unsafe-inline'");
  });

  it('allows eval only in development', () => {
    expect(directive(buildCsp({ ...base, isDev: true }), 'script-src')).toContain("'unsafe-eval'");
  });

  it('limits connect-src to self and the API origin', () => {
    const connect = directive(buildCsp({ ...base, isDev: false }), 'connect-src');
    expect(connect).toBe("connect-src 'self' https://api.example.com");
    expect(directive(buildCsp({ ...base, isDev: true }), 'connect-src')).toContain('ws://localhost:3000');
  });

  it('allows no third-party host for scripts, styles, fonts or connections (Monaco is self-hosted)', () => {
    const csp = buildCsp({ ...base, isDev: false });
    expect(csp).not.toContain('cdn.jsdelivr.net');
    expect(directive(csp, 'style-src')).toBe("style-src 'self' 'unsafe-inline'");
    expect(directive(csp, 'font-src')).toBe("font-src 'self' data:");
    expect(directive(csp, 'worker-src')).toBe("worker-src 'self' blob:");
  });

  it('denies framing except for embed routes', () => {
    expect(directive(buildCsp({ ...base, isDev: false }), 'frame-ancestors')).toBe("frame-ancestors 'none'");
    expect(directive(buildCsp({ ...base, isDev: false, embed: true }), 'frame-ancestors')).toBe('frame-ancestors *');
    expect(routeSecurityHeaders(false)).toEqual({ 'X-Frame-Options': 'DENY' });
    expect(routeSecurityHeaders(true)).toEqual({});
  });

  it('does not emit X-XSS-Protection', () => {
    expect(Object.keys(routeSecurityHeaders(false))).not.toContain('X-XSS-Protection');
  });
});

describe('helpers', () => {
  it.each([
    ['/ko/embed/abc', true],
    ['/embed/abc', true],
    ['/ko', false],
    ['/ko/embedded', false],
  ])('isEmbedPath(%s) = %s', (p, expected) => expect(isEmbedPath(p)).toBe(expected));

  it('generates distinct base64 nonces', () => {
    const a = generateNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(a).not.toBe(generateNonce());
  });
});
