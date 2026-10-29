import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // React Compiler diagnostics (eslint-plugin-react-hooks 7) flag patterns that
    // predate the upgrade (hydration-safe localStorage reads in effects). They are
    // warnings until the UI pass refactors those hooks (docs/specs/01, T1.7).
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
  {
    files: ['**/__tests__/**', '**/*.test.{ts,tsx}', 'tests/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'next-env.d.ts',
    'tests/e2e/report/**',
    'tests/e2e/report-stack/**',
    'playwright-report/**',
    // Copied from node_modules by scripts/copy-monaco.mjs.
    'public/monaco/**',
    'test-results/**',
  ]),
]);
