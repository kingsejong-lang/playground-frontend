import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright against the real backend (docker compose in playground-backend).
 * The app is a production build served by `next start` on http://localhost:3000,
 * talking to the gateway at http://localhost:8080 (the gateway's ALLOWED_ORIGINS).
 * Use `localhost` on both sides: session cookies are not sent across 127.0.0.1/localhost.
 *
 *   npm run test:e2e:stack                 # build + start, then run every @stack test
 *   E2E_SKIP_BUILD=1 npm run test:e2e:stack  # reuse an existing .next build
 */
const apiUrl = process.env.E2E_API_URL || 'http://localhost:8080';

export default defineConfig({
  testDir: './tests/e2e/stack',
  grep: /@stack/,
  // Runs share one anonymous rate-limit budget per IP; keep them sequential.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['html', { outputFolder: 'tests/e2e/report-stack', open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'stack-chromium', use: { ...devices['Desktop Chrome'], locale: 'ko-KR' } }],
  webServer: {
    command: process.env.E2E_SKIP_BUILD ? 'npx next start -p 3000' : 'npm run build && npx next start -p 3000',
    url: 'http://localhost:3000/ko',
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: { NEXT_PUBLIC_API_URL: apiUrl },
  },
});
