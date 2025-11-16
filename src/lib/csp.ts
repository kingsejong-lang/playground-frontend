/**
 * Content Security Policy (CSP) utilities
 *
 * CSP helps prevent XSS attacks by controlling which resources can be loaded
 */

export interface CSPDirectives {
  'default-src'?: string[];
  'script-src'?: string[];
  'style-src'?: string[];
  'img-src'?: string[];
  'font-src'?: string[];
  'connect-src'?: string[];
  'worker-src'?: string[];
  'frame-src'?: string[];
  'frame-ancestors'?: string[];
  'base-uri'?: string[];
  'form-action'?: string[];
  'object-src'?: string[];
  'media-src'?: string[];
  'manifest-src'?: string[];
  'upgrade-insecure-requests'?: boolean;
  'block-all-mixed-content'?: boolean;
}

/**
 * Generate CSP header value from directives
 */
export function generateCSP(directives: CSPDirectives): string {
  const policies: string[] = [];

  for (const [directive, value] of Object.entries(directives)) {
    if (typeof value === 'boolean') {
      if (value) {
        policies.push(directive);
      }
    } else if (Array.isArray(value) && value.length > 0) {
      policies.push(`${directive} ${value.join(' ')}`);
    }
  }

  return policies.join('; ');
}

/**
 * Development CSP - More permissive for HMR and debugging
 */
export function getDevelopmentCSP(): CSPDirectives {
  return {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-eval'", // Required for Next.js HMR
      "'unsafe-inline'", // Required for Monaco Editor
      'https://cdn.jsdelivr.net', // Monaco Editor CDN
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for Monaco Editor and Tailwind
      'https://cdn.jsdelivr.net', // Monaco Editor CDN styles
    ],
    'img-src': [
      "'self'",
      'data:', // Data URLs for images
      'https:', // Allow HTTPS images
    ],
    'font-src': [
      "'self'",
      'data:', // Data URLs for fonts
      'https://cdn.jsdelivr.net', // Monaco Editor fonts
    ],
    'connect-src': [
      "'self'",
      'http://localhost:8080', // Backend API
      'ws://localhost:3001', // Next.js HMR WebSocket
      'ws://localhost:8080', // Backend WebSocket
      'wss://localhost:8080', // Backend WebSocket (if using wss)
      'https://cdn.jsdelivr.net', // Monaco Editor source maps
    ],
    'worker-src': [
      "'self'",
      'blob:', // Monaco Editor workers
    ],
    'frame-src': ["'none'"],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'object-src': ["'none'"],
  };
}

/**
 * Production CSP - Strict security policies
 */
export function getProductionCSP(): CSPDirectives {
  return {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-eval'", // Monaco Editor requires eval
      'https://cdn.jsdelivr.net', // Monaco Editor CDN
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Monaco Editor and Tailwind require inline styles
      'https://cdn.jsdelivr.net', // Monaco Editor CDN styles
    ],
    'img-src': [
      "'self'",
      'data:',
      'https:',
    ],
    'font-src': [
      "'self'",
      'data:',
      'https://cdn.jsdelivr.net',
    ],
    'connect-src': [
      "'self'",
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080', // Backend API
      'https://cdn.jsdelivr.net', // Monaco Editor source maps
    ],
    'worker-src': [
      "'self'",
      'blob:', // Monaco Editor workers
    ],
    'frame-src': ["'none'"],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'object-src': ["'none'"],
    'upgrade-insecure-requests': true,
    'block-all-mixed-content': true,
  };
}

/**
 * Get CSP directives based on environment
 */
export function getCSP(): CSPDirectives {
  const isDevelopment = process.env.NODE_ENV === 'development';
  return isDevelopment ? getDevelopmentCSP() : getProductionCSP();
}

/**
 * Get CSP header value for current environment
 */
export function getCSPHeader(): string {
  return generateCSP(getCSP());
}

/**
 * Additional security headers
 */
export function getSecurityHeaders() {
  return [
    {
      key: 'Content-Security-Policy',
      value: getCSPHeader(),
    },
    {
      key: 'X-Frame-Options',
      value: 'DENY',
    },
    {
      key: 'X-Content-Type-Options',
      value: 'nosniff',
    },
    {
      key: 'X-XSS-Protection',
      value: '1; mode=block',
    },
    {
      key: 'Referrer-Policy',
      value: 'strict-origin-when-cross-origin',
    },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    },
  ];
}
