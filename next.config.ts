import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import bundleAnalyzer from '@next/bundle-analyzer';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// The analyzer is a webpack plugin; `npm run analyze` builds with `--webpack`.
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Response compression by the Next.js server. On by default (direct `next start`).
 * Set NEXT_COMPRESS=false behind a proxy that compresses itself (for example
 * Envoy Gateway with brotli/gzip/zstd): the proxy then picks the best encoding
 * and the Node process does no gzip work.
 */
export function compressEnabled(value = process.env.NEXT_COMPRESS): boolean {
  return value?.trim().toLowerCase() !== 'false';
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: compressEnabled(),
  // Do not write AGENTS.md into the repository on `next dev`.
  agentRules: false,

  compiler: {
    // Keep error/warn in production; drop debug logging.
    removeConsole: isProduction ? { exclude: ['error', 'warn'] } : false,
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 365,
  },

  experimental: {
    optimizePackageImports: ['@monaco-editor/react', 'react-resizable-panels', 'lucide-react'],
  },

  // Request-independent security headers. The CSP (per-request nonce) and the
  // route-dependent X-Frame-Options are set in src/proxy.ts.
  async headers() {
    const headers = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    ];
    if (isProduction) {
      headers.push({ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' });
    }
    return [
      { source: '/:path*', headers },
      // Self-hosted Monaco (scripts/copy-monaco.mjs): the version is in the path, so it never changes.
      { source: '/monaco/:version/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    ];
  },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));
