/**
 * End-to-end tests against the real gateway and services (docker compose in
 * playground-backend). Run with `npm run test:e2e:stack`; see tests/e2e/README.md.
 * Every test here is tagged @stack.
 */
import { expect, test } from '@playwright/test';
import { addFile, editorValue, headerButton, openPlayground, output, runAndWait, runButton, setEditor, setEntry, stopButton, tab } from '../helpers';

test.describe('real stack', { tag: '@stack' }, () => {
  test('first visit loads the KingSejong starter template and runs it', async ({ page }) => {
    await openPlayground(page);
    await expect(page.getByRole('combobox', { name: '프로그래밍 언어' })).toHaveValue('kingsejong');
    expect(await editorValue(page)).toContain('출력(');
    await runAndWait(page);
    await expect(output(page)).toContainText('실행 완료');
    await expect(output(page)).toContainText('안녕하세요');
  });

  test('template gallery replaces the code and offers undo', async ({ page }) => {
    await openPlayground(page);
    await headerButton(page, '템플릿').click();
    const dialog = page.getByRole('dialog', { name: '템플릿' });
    const first = dialog.getByRole('listitem').first().getByRole('button');
    await expect(first).toBeVisible();
    await first.click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('status').filter({ hasText: '템플릿을 불러왔어요' })).toBeVisible();
  });

  test('multi-file run: the entry file imports another file', async ({ page }) => {
    await openPlayground(page);
    await setEditor(page, '가져오기 "util"\n출력(두배(21))\n');
    await addFile(page, 'util.ksj', '두배 = 함수(x) {\n    반환 x * 2\n}\n');
    await setEntry(page, 'main.ksj');
    await runAndWait(page);
    await expect(output(page)).toContainText('42');
    await expect(output(page)).toContainText('실행 완료');
  });

  test('multi-file run: a Python entry file imports a module next to it', async ({ page }) => {
    await openPlayground(page);
    await page.getByRole('combobox', { name: '프로그래밍 언어' }).selectOption('python');
    await expect(tab(page, 'main.py')).toBeVisible();
    await setEditor(page, 'import util\nprint(util.double(21))\n');
    await addFile(page, 'util.py', 'def double(x):\n    return x * 2\n');
    await setEntry(page, 'main.py');
    await runAndWait(page);
    await expect(output(page)).toContainText('42');
  });

  test('multi-file run: a Go program split over two files', async ({ page }) => {
    await openPlayground(page);
    await page.getByRole('combobox', { name: '프로그래밍 언어' }).selectOption('go');
    await expect(tab(page, 'main.go')).toBeVisible();
    await setEditor(page, 'package main\n\nimport "fmt"\n\nfunc main() { fmt.Println(double(21)) }\n');
    await addFile(page, 'util.go', 'package main\n\nfunc double(x int) int { return x * 2 }\n');
    await runAndWait(page, 60_000);
    await expect(output(page)).toContainText('42');
  });

  test('compile error shows a diagnostic that jumps to the line', async ({ page }) => {
    await openPlayground(page);
    await setEditor(page, '출력("하나")\n출력("둘"\n');
    await runAndWait(page);
    const location = output(page).getByRole('button', { name: /main\.ksj:\d+/ }).first();
    await expect(location).toBeVisible();
    await location.click();
    await expect(page.getByRole('textbox', { name: /코드 편집기/ })).toBeFocused();
  });

  test('Python reads program input from stdin', async ({ page }) => {
    await openPlayground(page);
    await page.getByRole('combobox', { name: '프로그래밍 언어' }).selectOption('python');
    await expect.poll(() => editorValue(page)).toContain('print');
    await setEditor(page, 'name = input()\nn = int(input())\nprint(f"{name}:{n * 2}")\n');
    await page.getByRole('button', { name: /프로그램 입력/ }).click();
    await page.getByRole('textbox', { name: /표준 입력/ }).fill('세종\n21\n');
    await runAndWait(page);
    await expect(output(page)).toContainText('세종:42');
  });

  test('Stop ends a long run', async ({ page }) => {
    await openPlayground(page);
    await page.getByRole('combobox', { name: '프로그래밍 언어' }).selectOption('python');
    await setEditor(page, 'import time\nwhile True:\n    print("tick", flush=True)\n    time.sleep(0.2)\n');
    await runButton(page).click();
    await expect(output(page)).toContainText('tick', { timeout: 30_000 });
    await stopButton(page).click();
    await expect(output(page)).toContainText('중지됨', { timeout: 15_000 });
  });

  test('output limit shows the truncation notice', async ({ page }) => {
    await openPlayground(page);
    await page.getByRole('combobox', { name: '프로그래밍 언어' }).selectOption('python');
    await setEditor(page, 'import sys\nfor i in range(200000):\n    sys.stdout.write("가나다라마바사아자차카타파하 " * 4 + "\\n")\n');
    await runAndWait(page, 60_000);
    await expect(output(page)).toContainText('출력 제한');
  });

  test('share link opens in a new context and in the embed view', async ({ page, browser }) => {
    await openPlayground(page);
    await setEditor(page, '출력("공유된 코드")\n');
    await headerButton(page, '공유').click();
    const dialog = page.getByRole('dialog', { name: '코드 공유' });
    const link = await dialog.getByRole('textbox', { name: '공유 링크' }).inputValue();
    const embed = await dialog.getByRole('textbox', { name: '임베드 코드' }).inputValue();
    expect(link).toMatch(/\?share=[A-Za-z0-9_-]{8,22}$/);

    const other = await browser.newContext();
    const visitor = await other.newPage();
    await visitor.goto(link);
    await expect.poll(() => editorValue(visitor), { timeout: 30_000 }).toContain('공유된 코드');

    const embedUrl = embed.match(/src="([^"]+)"/)?.[1];
    expect(embedUrl).toBeTruthy();
    await visitor.goto(embedUrl!);
    await expect(visitor.getByText('읽기 전용')).toBeVisible();
    await visitor.getByRole('button', { name: '실행', exact: true }).click();
    await expect(visitor.locator('section[aria-labelledby="output-title"]')).toContainText('공유된 코드', { timeout: 30_000 });
    await other.close();
  });

  test('register, settings persist after reload, logout', async ({ page }) => {
    const email = `e2e-${Date.now()}@example.com`;
    await openPlayground(page);
    await headerButton(page, '로그인').click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: /회원 가입/ }).click();
    await dialog.getByLabel('이름').fill('세종');
    await dialog.getByLabel('이메일').fill(email);
    await dialog.getByLabel('비밀번호').fill('correct-horse-battery');
    await dialog.getByRole('button', { name: '회원 가입', exact: true }).click();
    await expect(headerButton(page, /세종/)).toBeVisible();

    await headerButton(page, '설정').click();
    const settings = page.getByRole('dialog', { name: '설정' });
    const minimap = settings.getByRole('switch', { name: '미니맵 보기' });
    const before = await minimap.getAttribute('aria-checked');
    const after = before === 'true' ? 'false' : 'true';
    await minimap.click();
    await expect(minimap).toHaveAttribute('aria-checked', after);
    await settings.getByLabel('글자 크기').fill('18');
    await settings.getByRole('button', { name: '설정 저장' }).click();
    await page.reload();
    await expect(headerButton(page, /세종/)).toBeVisible({ timeout: 30_000 });
    await headerButton(page, '설정').click();
    const reopened = page.getByRole('dialog', { name: '설정' });
    await expect(reopened.getByRole('switch', { name: '미니맵 보기' })).toHaveAttribute('aria-checked', after);
    await expect(reopened.getByLabel('글자 크기')).toHaveValue('18');
    await page.keyboard.press('Escape');

    await headerButton(page, /세종/).click();
    await expect(headerButton(page, '로그인')).toBeVisible();
    await page.reload();
    await expect(headerButton(page, '로그인')).toBeVisible({ timeout: 30_000 });
  });

  test('too many runs show the rate-limit message with a countdown', async ({ page }) => {
    await openPlayground(page);
    await setEditor(page, '출력(1)\n');
    // Anonymous visitors get 10 runs per minute; the 11th within the minute is refused.
    for (let i = 0; i < 12; i++) {
      await runAndWait(page);
      if ((await output(page).getByText('짧은 시간에 너무 많이 실행했어요').count()) > 0) break;
    }
    await expect(output(page)).toContainText('짧은 시간에 너무 많이 실행했어요');
    await expect(output(page).getByRole('button', { name: /다시 시도 \(\d+\)/ })).toBeDisabled();
  });
});

test.describe('backend down', { tag: '@stack' }, () => {
  test('shows the unavailable state and keeps the editor usable', async ({ page }) => {
    // Simulate the gateway disappearing by failing every request to it.
    await page.route('http://localhost:8080/**', (route) => route.abort('connectionrefused'));
    await page.goto('/ko');
    await expect(page.getByText('플레이그라운드 서버에 연결할 수 없어요')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: '다시 연결' })).toBeVisible();
    await expect.poll(() => editorValue(page), { timeout: 30_000 }).toContain('출력(');
  });
});

