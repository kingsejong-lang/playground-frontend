import { expect, test } from '@playwright/test';

/**
 * Smoke test that needs no backend: NEXT_PUBLIC_API_URL points at a closed port,
 * so every RPC fails at the network level and the page must degrade gracefully.
 */
test.describe('playground without backend', () => {
  test('renders /ko with a server-unavailable message and no app errors', async ({ page }) => {
    const appErrors: string[] = [];
    page.on('console', (msg) => {
      // Browsers log refused connections themselves; only application errors count.
      if (msg.type() === 'error' && !/Failed to load resource|ERR_CONNECTION_REFUSED/.test(msg.text())) {
        appErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => appErrors.push(err.message));

    const response = await page.goto('/ko');
    expect(response?.status()).toBe(200);
    const csp = response?.headers()['content-security-policy'] ?? '';
    expect(csp).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);

    await expect(page.getByRole('button', { name: /^실행/ })).toBeVisible();
    await expect(page.getByText('플레이그라운드 서버에 연결할 수 없어요')).toBeVisible();
    expect(appErrors).toEqual([]);
  });

  test('redirects / to a locale (Accept-Language, default ko)', async ({ request }) => {
    const ko = await request.get('/', { maxRedirects: 0, headers: { 'Accept-Language': 'ko-KR' } });
    expect(ko.headers()['location']).toMatch(/\/ko$/);
    const en = await request.get('/', { maxRedirects: 0, headers: { 'Accept-Language': 'en-US' } });
    expect(en.headers()['location']).toMatch(/\/en$/);
  });

  test('allows framing only for embed routes', async ({ request }) => {
    const main = await request.get('/ko');
    expect(main.headers()['x-frame-options']).toBe('DENY');
    const embed = await request.get('/ko/embed/AbCdEfGh1234');
    expect(embed.headers()['x-frame-options']).toBeUndefined();
    expect(embed.headers()['content-security-policy']).toContain('frame-ancestors *');
  });
});
