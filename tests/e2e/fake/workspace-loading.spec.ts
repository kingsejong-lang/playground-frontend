/**
 * Loading templates, history and snippets into a workspace with several files.
 */
import { expect, test, type Page } from '@playwright/test';
import { addFile, editorValue, headerButton, openPlayground, output, runAndWait, setEditor, setEntry, tab } from '../helpers';

const tabNames = (page: Page) => page.getByRole('list', { name: '열린 파일' }).getByRole('listitem').allInnerTexts();
const undoToast = (page: Page, text: string) => page.getByRole('status').filter({ hasText: text });

test('a multi-file template replaces the workspace and sets its entry file; Undo restores', async ({ page }) => {
  await openPlayground(page);
  await setEditor(page, '출력("내 코드")\n');
  await addFile(page, 'mine.ksj', '출력("내 파일")\n');

  await headerButton(page, '템플릿').click();
  await page.getByRole('dialog', { name: '템플릿' }).getByRole('button', { name: /파일 나누기/ }).click();
  await expect.poll(() => tabNames(page)).toEqual([expect.stringContaining('도구.ksj'), expect.stringContaining('main.ksj')]);
  await expect(tab(page, 'main.ksj')).toHaveAccessibleName(/진입 파일/);
  expect(await editorValue(page)).toContain('가져오기 "도구"');

  await undoToast(page, '템플릿을 불러왔어요').getByRole('button', { name: '되돌리기' }).click();
  await expect.poll(() => tabNames(page)).toEqual([expect.stringContaining('main.ksj'), expect.stringContaining('mine.ksj')]);
  await tab(page, 'main.ksj').click();
  await expect.poll(() => editorValue(page)).toBe('출력("내 코드")\n');
});

test('history keeps every file of a run and restores the whole workspace; Undo restores', async ({ page }) => {
  await openPlayground(page);
  await setEditor(page, '출력("첫 파일")\n');
  await addFile(page, 'second.ksj', '출력("두 번째 파일")\n');
  await setEntry(page, 'second.ksj');
  await runAndWait(page);
  await expect(output(page)).toContainText('두 번째 파일');

  // Start over with a different workspace, then restore the run.
  await page.getByRole('button', { name: 'second.ksj 닫기' }).click();
  await setEditor(page, '출력("다른 코드")\n');
  await headerButton(page, '실행 기록').click();
  const sheet = page.getByRole('dialog', { name: '실행 기록' });
  await expect(sheet).toContainText('second.ksj 외 1개 파일');
  await sheet.getByRole('button', { name: /^이 기록을 편집기로 불러오기/ }).first().click();

  await expect.poll(() => tabNames(page)).toEqual([expect.stringContaining('main.ksj'), expect.stringContaining('second.ksj')]);
  await expect(tab(page, 'second.ksj')).toHaveAccessibleName(/진입 파일/);
  await tab(page, 'main.ksj').click();
  await expect.poll(() => editorValue(page)).toBe('출력("첫 파일")\n');

  await undoToast(page, '불러왔어요').getByRole('button', { name: '되돌리기' }).click();
  await expect.poll(() => tabNames(page)).toEqual([expect.stringContaining('main.ksj')]);
  await expect.poll(() => editorValue(page)).toBe('출력("다른 코드")\n');
});

test('history entries from before multi-file history still load', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('playground_execution_history')) return;
    localStorage.setItem(
      'playground_execution_history',
      JSON.stringify([
        {
          id: 'hist_old',
          timestamp: new Date().toISOString(),
          language: 'kingsejong',
          code: '출력("옛 기록")\n',
          output: { status: 'succeeded', success: true, chunks: [], diagnostics: [], truncated: [], gaps: 0, reconnected: false },
          success: true,
        },
      ])
    );
  });
  await openPlayground(page);
  await headerButton(page, '실행 기록').click();
  await page.getByRole('dialog', { name: '실행 기록' }).getByRole('button', { name: /^이 기록을 편집기로 불러오기/ }).click();
  await expect.poll(() => tabNames(page)).toEqual([expect.stringContaining('main.ksj')]);
  await expect.poll(() => editorValue(page)).toBe('출력("옛 기록")\n');
});

test('a snippet goes in at the cursor and leaves the rest of the file alone', async ({ page }) => {
  await openPlayground(page);
  await setEditor(page, '출력("앞")');
  await page.getByRole('button', { name: '메뉴 더 보기' }).click();
  await page.getByRole('button', { name: '스니펫' }).click();
  const dialog = page.getByRole('dialog', { name: '스니펫' });
  await dialog.getByRole('button', { name: '새 스니펫' }).click();
  const form = dialog.getByRole('form', { name: '새 스니펫' });
  await form.getByLabel(/^제목/).fill('인사');
  await form.getByLabel(/^코드/).fill('출력("스니펫")');
  await form.getByRole('button', { name: '저장' }).click();
  await dialog.getByRole('button', { name: '인사을(를) 편집기에 넣기' }).click();
  await expect(dialog).toBeHidden();
  // Inserted on a new line below the existing code (one-line models may use CRLF).
  await expect.poll(() => editorValue(page).then((v) => v.replace(/\r\n/g, '\n'))).toBe('출력("앞")\n출력("스니펫")');
  await expect.poll(() => tabNames(page)).toEqual([expect.stringContaining('main.ksj')]);
});
