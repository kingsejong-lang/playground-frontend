/**
 * Global keyboard shortcuts on Linux and Windows (Ctrl, not ⌘), with focus
 * outside the code editor. The platform is pinned to Linux so the tests mean
 * the same on a macOS developer machine as on the Linux CI runner.
 */
import { expect, test, type Page } from '@playwright/test';
import { editorValue, openPlayground, output, runButton, setEditor, stopButton } from '../helpers';

test.use({
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'platform', { get: () => 'Linux x86_64' });
    // Record, after all handlers ran, whether each Ctrl shortcut had its default action cancelled.
    const seen: { key: string; prevented: boolean }[] = [];
    (window as unknown as { __keys: typeof seen }).__keys = seen;
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey) setTimeout(() => seen.push({ key: e.key, prevented: e.defaultPrevented }));
    });
  });
});

const keysSeen = (page: Page) => page.evaluate(() => (window as unknown as { __keys: { key: string; prevented: boolean }[] }).__keys);

/** Moves focus out of the editor, onto the page body. */
async function focusOutsideEditor(page: Page) {
  await output(page).click({ position: { x: 5, y: 5 } });
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
}

test('the run button advertises Ctrl+Enter, not ⌘', async ({ page }) => {
  await openPlayground(page);
  await expect(runButton(page)).toHaveAttribute('aria-keyshortcuts', 'Control+Enter');
});

test('Control+Enter runs the code', async ({ page }) => {
  await openPlayground(page);
  await setEditor(page, '출력("단축키로 실행")\n');
  await focusOutsideEditor(page);
  await page.keyboard.press('Control+Enter');
  await expect(output(page)).toContainText('단축키로 실행');
  await expect(output(page)).toContainText('실행 완료');
  await expect.poll(() => keysSeen(page)).toContainEqual({ key: 'Enter', prevented: true });
});

test('Control+. stops a running program', async ({ page }) => {
  await openPlayground(page, '?fake=slow');
  await focusOutsideEditor(page);
  await page.keyboard.press('Control+Enter');
  await expect(stopButton(page)).toBeVisible();
  await expect(output(page)).toContainText('작업 1 처리 중');
  await page.keyboard.press('Control+.');
  await expect(runButton(page)).toBeVisible();
  await expect(output(page)).toContainText('실행을 중지했어요');
  await expect.poll(() => keysSeen(page)).toContainEqual({ key: '.', prevented: true });
});

test('Control+S saves a draft and does not open the browser save dialog', async ({ page }) => {
  await openPlayground(page);
  await setEditor(page, '출력("임시 저장")\n');
  await focusOutsideEditor(page);
  await page.keyboard.press('Control+s');
  await expect(page.getByRole('status').filter({ hasText: /^임시 저장됨/ })).toBeVisible();
  // The browser's "save page" is the default action; it must have been cancelled.
  await expect.poll(() => keysSeen(page)).toContainEqual({ key: 's', prevented: true });
  // The draft is restored after a reload.
  await page.reload();
  await expect.poll(() => editorValue(page), { timeout: 30_000 }).toBe('출력("임시 저장")\n');
});

test('Meta+Enter does nothing on Linux', async ({ page }) => {
  await openPlayground(page);
  await focusOutsideEditor(page);
  await page.keyboard.press('Meta+Enter');
  await page.waitForTimeout(500);
  await expect(output(page)).toContainText('코드를 실행하면 결과가 여기에 나와요');
});
