/**
 * The KingSejong language reference panel against the fake backend.
 */
import { expect, test } from '@playwright/test';
import { editorValue, headerButton, openPlayground, setEditor } from '../helpers';

test('reference panel searches and inserts an example at the cursor', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openPlayground(page);
  await setEditor(page, '출력("처음")');
  await headerButton(page, '문법 참고').click();
  const panel = page.getByRole('complementary', { name: '문법 참고' });
  await expect(panel).toBeVisible();

  await panel.getByRole('searchbox', { name: '문법 검색' }).fill('filter');
  await expect(panel.getByRole('status')).toHaveText('1개 항목');
  await panel.getByRole('button', { name: '걸러내기 예제를 편집기에 넣기' }).click();

  // Inserted on a new line below the existing code, which stays in place.
  // (A one-line model takes the platform's line ending, so compare with \n.)
  await expect.poll(() => editorValue(page).then((v) => v.replace(/\r\n/g, '\n'))).toMatch(/^출력\("처음"\)\n숫자들 = \[1, 2, 3, 4, 5, 6\]\n짝수 = 숫자들을 걸러낸다/);
  // One undo step removes the whole example. (Keyboard input does not reach Monaco's
  // EditContext reliably in headless Chromium, so undo goes through the model.)
  await page.evaluate(() => (window as unknown as { monaco: { editor: { getEditors(): { getModel(): { undo(): void } }[] } } }).monaco.editor.getEditors()[0].getModel().undo());
  await expect.poll(() => editorValue(page)).toBe('출력("처음")');

  await panel.getByRole('button', { name: '닫기' }).click();
  await expect(panel).toBeHidden();
});

test('reference examples are read-only for other languages', async ({ page }) => {
  await openPlayground(page);
  await page.getByRole('combobox', { name: '프로그래밍 언어' }).selectOption('python');
  await page.getByRole('button', { name: '메뉴 더 보기' }).click();
  await page.getByRole('button', { name: '문법 참고' }).last().click();
  const panel = page.getByRole('complementary', { name: '문법 참고' });
  await expect(panel.getByText('예제는 킹세종 코드예요.')).toBeVisible();
  await expect(panel.getByRole('button', { name: /예제를 편집기에 넣기$/ })).toHaveCount(0);
  await panel.getByRole('button', { name: '킹세종으로 바꾸기' }).click();
  await expect(page.getByRole('combobox', { name: '프로그래밍 언어' })).toHaveValue('kingsejong');
  await expect(panel.getByRole('button', { name: /예제를 편집기에 넣기$/ }).first()).toBeVisible();
});
