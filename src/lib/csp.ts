/**
 * Content Security Policy and route-dependent security headers.
 * Applied per request by src/proxy.ts (nonce-based, see docs/specs/04-security-hardening).
 *
 * Usage:
 *   const policy = buildCsp({ nonce, isDev: false, apiOrigin: 'https://api.example.com', embed: false });
 */

export interface CspOptions {
  nonce: string;
  isDev: boolean;
  /** Origin of the Connect gateway (NEXT_PUBLIC_API_URL). */
  apiOrigin: string;
  /** True for /[locale]/embed/* which is designed to be framed by other sites. */
  embed: boolean;
}

/** Returns the origin (scheme://host[:port]) of a URL, or the input if it is not a URL. */
export function toOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

export function buildCsp({ nonce, isDev, apiOrigin, embed }: CspOptions): string {
  const api = toOrigin(apiOrigin);
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    // 'strict-dynamic': scripts loaded by nonce'd scripts (Monaco's loader, served from
    // /monaco on this origin) are trusted;
    // host allow-lists are ignored by CSP3 browsers. React dev tooling needs eval in dev only.
    'script-src': ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(isDev ? ["'unsafe-eval'"] : [])],
    // Monaco and React style attributes inject inline styles.
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", api, ...(isDev ? ['ws://localhost:3000', 'ws://127.0.0.1:3000'] : [])],
    'worker-src': ["'self'", 'blob:'],
    'frame-src': ["'none'"],
    'frame-ancestors': embed ? ['*'] : ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'object-src': ["'none'"],
    'manifest-src': ["'self'"],
  };
  const parts = Object.entries(directives).map(([k, v]) => `${k} ${[...new Set(v)].join(' ')}`);
  if (!isDev) parts.push('upgrade-insecure-requests');
  return parts.join('; ');
}

/** Headers that depend on the route. X-XSS-Protection is intentionally absent (deprecated). */
export function routeSecurityHeaders(embed: boolean): Record<string, string> {
  return embed ? {} : { 'X-Frame-Options': 'DENY' };
}

/** True for /<locale>/embed/<id> paths. */
export function isEmbedPath(pathname: string): boolean {
  return /^\/(?:[a-z]{2}\/)?embed(?:\/|$)/.test(pathname);
}

export function generateNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
