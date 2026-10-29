import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'tests/e2e'],
    // next-intl's middleware imports "next/server" without an extension; let Vite resolve it.
    server: { deps: { inline: ['next-intl'] } },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/__tests__/**', 'src/test/**', 'src/app/**/layout.tsx'],
      reporter: ['text-summary', 'json-summary', 'html'],
      // `npm run test:coverage` (run in CI) fails when coverage drops below these.
      // src/app/** (route pages and their header/modal wiring) has no threshold of
      // its own: it composes the hooks and components measured below, needs the
      // Next.js runtime, and is exercised by the Playwright suites instead
      // (tests/e2e/fake on every pull request, tests/e2e/stack against the backend).
      // It still counts toward the global numbers.
      thresholds: {
        lines: 80,
        statements: 78,
        branches: 70,
        functions: 72,
        'src/lib/**': { lines: 90, statements: 90, branches: 85, functions: 90 },
        'src/features/**': { lines: 90, statements: 90, branches: 80, functions: 85 },
        'src/{components,hooks,contexts}/**': { lines: 85, statements: 82, branches: 80, functions: 75 },
      },
    },
  },
});
