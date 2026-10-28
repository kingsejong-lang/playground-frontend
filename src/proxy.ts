/**
 * Next.js 16 proxy (formerly middleware): locale routing (next-intl) plus a
 * per-request CSP nonce. Next.js reads the nonce from the request's
 * Content-Security-Policy header and applies it to its own scripts.
 */
import createMiddleware from 'next-intl/middleware';
import { NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { buildCsp, generateNonce, isEmbedPath, routeSecurityHeaders } from './lib/csp';

const handleI18nRouting = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const nonce = generateNonce();
  const csp = buildCsp({
    nonce,
    isDev: process.env.NODE_ENV === 'development',
    apiOrigin: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
    embed: isEmbedPath(request.nextUrl.pathname),
  });

  // Forward the nonce to rendering via request headers (next-intl copies them
  // into NextResponse.next/rewrite({ request: { headers } })).
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', csp);
  const forwarded = new NextRequest(request, { headers });

  const response = handleI18nRouting(forwarded);
  response.headers.set('Content-Security-Policy', csp);
  for (const [k, v] of Object.entries(routeSecurityHeaders(isEmbedPath(request.nextUrl.pathname)))) {
    response.headers.set(k, v);
  }
  return response;
}

export const config = {
  // All pages except Next internals and files with an extension (static assets).
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|_vercel|.*\\..*).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
