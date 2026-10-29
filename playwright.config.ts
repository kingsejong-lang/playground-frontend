import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright against the development fake transport: no backend needed, so this
 * runs in frontend CI. The app is `next dev` with NEXT_PUBLIC_RPC_FAKE=1 (the fake
 * cannot be enabled in a production build). Failure modes come from ?fake=...
 * (see src/lib/rpc/fake.ts).
 *
 *   npm run test:e2e           # fake backend (this file)
 *   npm run test:e2e:stack     # real backend (playwright.stack.config.ts)
 */
const port = Number(process.env.E2E_FAKE_PORT || 3100);

export default defineConfig({
  testDir: './tests/e2e',
  testIgnore: ['**/stack/**'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['html', { outputFolder: 'tests/e2e/report', open: 'never' }], ['list']],
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // Firefox and WebKit run only this fake-backend suite (not the @stack suite), each
  // in its own CI job: `npx playwright test --project fake-firefox`.
  projects: [
    { name: 'fake-chromium', use: { ...devices['Desktop Chrome'], locale: 'ko-KR' } },
    { name: 'fake-firefox', use: { ...devices['Desktop Firefox'], locale: 'ko-KR' } },
    { name: 'fake-webkit', use: { ...devices['Desktop Safari'], locale: 'ko-KR' } },
  ],
  webServer: {
    command: `npx next dev -p ${port}`,
    url: `http://localhost:${port}/ko`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: { NEXT_PUBLIC_RPC_FAKE: '1' },
  },
});
