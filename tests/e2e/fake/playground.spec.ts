/**
 * Deterministic UI tests against the development fake transport
 * (NEXT_PUBLIC_RPC_FAKE=1, src/lib/rpc/fake.ts). No backend is needed; failure
 * modes are chosen with ?fake=... . Runs in frontend CI (npm run test:e2e).
 */
import { expect, test } from '@playwright/test';
import { addFile, editorValue, headerButton, openPlayground, output, runAndWait, runButton, setEditor, setEntry, stopButton, tab } from '../helpers';

test('first visit shows the starter program and runs it', async ({ page }) => {
  await openPlayground(page);
  expect(await editorValue(page)).toContain('출력(');
  await expect(output(page)).toContainText('코드를 실행하면 결과가 여기에 나와요');
  await runAndWait(page);
  await expect(output(page)).toContainText('실행 완료');
  await expect(output(page)).toContainText('안녕하세요, 킹세종!');
});

test('switching language on untouched code opens that language starter file', async ({ page }) => {
  await openPlayground(page);
  await page.getByRole('combobox', { name: '프로그래밍 언어' }).selectOption('python');
  await expect(tab(page, 'main.py')).toBeVisible();
  await expect.poll(() => editorValue(page)).toContain('print(');
});

test('multi-file run starts from the chosen entry file', async ({ page }) => {
  await openPlayground(page);
  await addFile(page, 'second.ksj', '출력("두 번째 파일에서 시작")\n');
  await setEntry(page, 'second.ksj');
  await runAndWait(page);
  await expect(output(page)).toContainText('두 번째 파일에서 시작');
});

test('compile error diagnostic jumps to the line in the editor', async ({ page }) => {
  await openPlayground(page, '?fake=compile_error');
  await runAndWait(page);
  await expect(output(page)).toContainText('컴파일 오류');
  await output(page).getByRole('button', { name: /main\.ksj:2:1/ }).click();
  await expect(page.getByRole('textbox', { name: /코드 편집기/ })).toBeFocused();
});

test('program input is sent as stdin', async ({ page }) => {
  await openPlayground(page);
  await page.getByRole('button', { name: /프로그램 입력/ }).click();
  await page.getByRole('textbox', { name: /표준 입력/ }).fill('세종\n42\n');
  await runAndWait(page);
  await expect(output(page)).toContainText('입력: 세종');
  await expect(output(page)).toContainText('입력: 42');
});

test('Mod+. stops a long run', async ({ page }) => {
  await openPlayground(page, '?fake=slow');
  await runButton(page).click();
  await expect(output(page)).toContainText('작업 1 처리 중', { timeout: 10_000 });
  await expect(stopButton(page)).toBeVisible();
  await page.keyboard.press('ControlOrMeta+.');
  await expect(output(page)).toContainText('중지됨');
});

test('output limit shows the truncation notice', async ({ page }) => {
  await openPlayground(page, '?fake=output_limit');
  await runAndWait(page);
  await expect(output(page)).toContainText('출력 제한 초과');
  await expect(output(page)).toContainText('보여 주지 못했어요');
});

test('rate limit shows a warning with a countdown retry', async ({ page }) => {
  await openPlayground(page, '?fake=rate_limited');
  await runAndWait(page);
  await expect(output(page).getByText('짧은 시간에 너무 많이 실행했어요').first()).toBeVisible();
  await expect(output(page).getByRole('button', { name: /다시 시도 \(\d+\)/ })).toBeDisabled();
});

test('backend down: banner with reconnect, editor still usable', async ({ page }) => {
  await page.goto('/ko?fake=unavailable');
  await expect(page.getByText('플레이그라운드 서버에 연결할 수 없어요')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: '다시 연결' })).toBeVisible();
  await expect.poll(() => editorValue(page), { timeout: 30_000 }).toContain('출력(');
});

test('share dialog gives a link and embed code; the embed view runs', async ({ page, browser }) => {
  await openPlayground(page);
  await headerButton(page, '공유').click();
  const dialog = page.getByRole('dialog', { name: '코드 공유' });
  await expect(dialog.getByRole('textbox', { name: '공유 링크' })).toHaveValue(/\?share=[A-Za-z0-9_-]{8,22}$/);
  const embed = await dialog.getByRole('textbox', { name: '임베드 코드' }).inputValue();
  const embedUrl = embed.match(/src="([^"]+)"/)?.[1];
  expect(embedUrl).toMatch(/\/ko\/embed\//);
  const other = await browser.newContext();
  const visitor = await other.newPage();
  await visitor.goto(embedUrl!);
  await expect(visitor.getByText('읽기 전용')).toBeVisible({ timeout: 30_000 });
  await visitor.getByRole('button', { name: '실행', exact: true }).click();
  await expect(visitor.locator('section[aria-labelledby="output-title"]')).toContainText('실행 완료', { timeout: 30_000 });
  await other.close();
});

test('? opens the shortcut list; Mod+S saves a draft that survives a reload', async ({ page }) => {
  await openPlayground(page);
  await page.mouse.click(600, 28);
  await page.keyboard.press('?');
  await expect(page.getByRole('dialog', { name: '키보드 단축키' })).toBeVisible();
  await page.keyboard.press('Escape');
  await setEditor(page, '출력("임시 저장 확인")\n');
  await page.mouse.click(600, 28);
  await page.keyboard.press('ControlOrMeta+s');
  await expect(page.getByRole('status').filter({ hasText: '임시 저장됨' })).toBeVisible();
  await page.reload();
  await expect.poll(() => editorValue(page), { timeout: 30_000 }).toContain('임시 저장 확인');
});

test('sign in and sign out', async ({ page }) => {
  await openPlayground(page);
  await headerButton(page, '로그인').click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('이메일').fill('sejong@example.com');
  await dialog.getByLabel('비밀번호').fill('anything');
  await dialog.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(headerButton(page, /sejong/)).toBeVisible();
  await headerButton(page, /sejong/).click();
  await expect(headerButton(page, '로그인')).toBeVisible();
});

test('opening the file list for the first time keeps the editor', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openPlayground(page);
  await setEditor(page, '출력("그대로")');
  await page.getByRole('button', { name: '파일 목록 열기/닫기' }).first().click();
  await expect(page.getByRole('complementary', { name: '파일' })).toBeVisible();
  await expect(page.getByText('문제가 생겼어요')).toHaveCount(0);
  expect(await editorValue(page)).toBe('출력("그대로")');
});
