import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // React Compiler diagnostics (eslint-plugin-react-hooks 7) and the hook
    // dependency check fail the build: storage-backed state is read with
    // useSyncExternalStore (src/lib/local-store.ts), not copied in effects.
    rules: {
      'react-hooks/set-state-in-effect': 'error',
      'react-hooks/immutability': 'error',
      'react-hooks/preserve-manual-memoization': 'error',
      'react-hooks/exhaustive-deps': 'error',
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
