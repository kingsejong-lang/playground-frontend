/**
 * The English interface (/en): copy, error messages and shortcut help.
 * The rest of the suite runs in Korean, the default locale.
 */
import { expect, test } from '@playwright/test';
import { headerButton, openPlayground, output, runAndWait, runButton, setEditor } from '../helpers';

test('UI copy is English and the document language is en', async ({ page }) => {
  await openPlayground(page, '', 'en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  for (const name of ['Templates', 'History', 'Reference', 'Share']) await expect(headerButton(page, name)).toBeVisible();
  await expect(runButton(page)).toContainText('Run');
  await expect(output(page)).toContainText('Run your code to see the output here');
  await expect(page.getByRole('list', { name: 'Open files' })).toBeVisible();
  await setEditor(page, '출력("hello")\n');
  await runAndWait(page);
  await expect(output(page)).toContainText('Finished');
});

test('compile errors are explained in English', async ({ page }) => {
  await openPlayground(page, '?fake=compile_error', 'en');
  await runAndWait(page);
  await expect(output(page)).toContainText('Compile error');
  await expect(output(page)).toContainText('Fix the problems listed below, then run again.');
});

test('rate limiting is explained in English with a countdown', async ({ page }) => {
  await openPlayground(page, '?fake=rate_limited', 'en');
  await runAndWait(page);
  await expect(output(page).getByText('Too many runs in a short time').first()).toBeVisible();
  await expect(output(page).getByRole('button', { name: /Try again \(\d+\)/ })).toBeDisabled();
});

test('the server-unavailable banner is in English', async ({ page }) => {
  await page.goto('/en?fake=unavailable');
  await expect(page.getByText("Can't reach the playground server")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'Reconnect' })).toBeVisible();
});

test('shortcut help lists the keys in English', async ({ page }) => {
  await openPlayground(page, '', 'en');
  await page.locator('body').press('?');
  const dialog = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Run code');
  await expect(dialog).toContainText('Stop the run');
  await expect(dialog).toContainText('Save a draft in this browser');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('switching the interface language keeps the page and its query', async ({ page }) => {
  await openPlayground(page, '?fake=compile_error');
  await page.getByRole('button', { name: '메뉴 더 보기' }).click();
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page).toHaveURL(/\/en\?fake=compile_error$/);
  await expect(runButton(page)).toContainText('Run');
});

test('the file context menu opens, works and closes with Escape or a click outside', async ({ page }) => {
  await openPlayground(page, '', 'en');
  const mainTab = page.getByRole('list', { name: 'Open files' }).getByRole('button', { name: /^main\.ksj/ });
  await mainTab.click({ button: 'right' });
  const menu = page.locator('[popover][aria-label="main.ksj menu"]');
  await expect(menu).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await mainTab.click({ button: 'right' });
  await expect(menu).toBeVisible();
  await output(page).click({ position: { x: 10, y: 10 } });
  await expect(menu).toBeHidden();
  await mainTab.click({ button: 'right' });
  await menu.getByRole('button', { name: 'Rename' }).click();
  await expect(page.getByRole('textbox', { name: 'New name for main.ksj' })).toBeFocused();
});
