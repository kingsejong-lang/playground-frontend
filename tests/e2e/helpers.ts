/**
 * Shared steps for the Playwright suites (fake backend and real stack).
 * Locators use roles and the Korean UI (`/ko`), which is the default locale.
 */
import { expect, type Page } from '@playwright/test';

export const output = (page: Page) => page.locator('section[aria-labelledby="output-title"]');
/** Run and Stop are found by their keyboard shortcut (Mod+Enter / Mod+.), which no other button has. */
export const runButton = (page: Page) => page.locator('header button[aria-keyshortcuts$="+Enter"]');
export const stopButton = (page: Page) => page.locator('header button[aria-keyshortcuts$="+."]');
/** The tab's select button (its name is the file name, plus "(진입 파일)" for the entry file). */
export const tab = (page: Page, name: string) =>
  page.getByRole('list', { name: '열린 파일' }).getByRole('button', { name: new RegExp(`^${name.replace(/\./g, '\\.')}( \\(진입 파일\\))?$`) });
/** Header buttons (the same actions also exist, hidden, in the "more" menu). */
export const headerButton = (page: Page, name: string | RegExp) => page.locator('header nav').getByRole('button', { name });

/** Opens /ko (plus query) and waits until the editor holds code. */
export async function openPlayground(page: Page, query = '') {
  await page.goto(`/ko${query}`);
  await expect(page.getByRole('textbox', { name: /코드 편집기/ })).toBeAttached({ timeout: 30_000 });
  await expect.poll(() => editorValue(page), { timeout: 30_000 }).not.toBe('');
}

export function editorValue(page: Page): Promise<string> {
  return page.evaluate(() => {
    const w = window as unknown as { monaco?: { editor: { getEditors(): { getModel(): { getValue(): string } }[] } } };
    return w.monaco?.editor.getEditors()[0]?.getModel().getValue() ?? '';
  });
}

/** Replaces the active file's content (as typing would, through the editor model). */
export async function setEditor(page: Page, code: string) {
  await page.evaluate((value) => {
    const w = window as unknown as { monaco: { editor: { getEditors(): { getModel(): { setValue(v: string): void } }[] } } };
    w.monaco.editor.getEditors()[0].getModel().setValue(value);
  }, code);
}

/** Adds a file with the given name and content; it becomes the active file. */
export async function addFile(page: Page, name: string, code: string) {
  await page.getByRole('button', { name: '새 파일' }).first().click();
  const created = page.getByRole('list', { name: '열린 파일' }).getByRole('listitem').last().getByRole('button').first();
  await created.dblclick();
  const input = page.getByRole('textbox', { name: /의 새 이름/ });
  await input.fill(name);
  await input.press('Enter');
  await expect(tab(page, name)).toBeVisible();
  await setEditor(page, code);
}

export async function setEntry(page: Page, name: string) {
  if (/진입 파일/.test((await tab(page, name).getAttribute('aria-label')) ?? (await tab(page, name).innerText()))) return;
  await tab(page, name).click({ button: 'right' });
  await page.getByRole('button', { name: '진입 파일로 지정' }).click();
  await expect(tab(page, name)).toHaveAccessibleName(/진입 파일/);
}

const finishedRuns = (page: Page) => page.locator('main').getAttribute('data-finished-runs').then(Number);

/** Clicks Run and waits until that run has ended (success, failure or a refused request). */
export async function runAndWait(page: Page, timeout = 30_000) {
  const before = await finishedRuns(page);
  await runButton(page).click();
  await expect.poll(() => finishedRuns(page), { timeout }).toBeGreaterThan(before);
}
