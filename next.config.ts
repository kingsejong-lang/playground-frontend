import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import bundleAnalyzer from '@next/bundle-analyzer';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// The analyzer is a webpack plugin; `npm run analyze` builds with `--webpack`.
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });

const isProduction = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
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
    return [{ source: '/:path*', headers }];
  },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));
