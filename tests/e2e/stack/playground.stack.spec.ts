/**
 * End-to-end tests against the real gateway and services (docker compose in
 * playground-backend). Run with `npm run test:e2e:stack`; see tests/e2e/README.md.
 * Every test here is tagged @stack.
 */
import { expect, test, type Page, type Route } from '@playwright/test';
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

const finishedRuns = (page: Page) => page.locator('main').getAttribute('data-finished-runs').then(Number);

test.describe('backend down', { tag: '@stack' }, () => {
  /**
   * The page's first load is rendered on the server (language list and starter
   * code), so blocking the gateway in the browser before navigating no longer
   * reaches the browser's first RPC. What a visitor meets instead is the gateway
   * going away mid-session: the next browser request fails. The first-load
   * unavailable banner is covered by the fake-backend suite (?fake=unavailable).
   */
  test('a run while the gateway is unreachable explains it, and Try again recovers', async ({ page }) => {
    await openPlayground(page);
    await setEditor(page, '출력("다시 연결됨")\n');

    const blockGateway = (route: Route) => route.abort('connectionrefused');
    await page.route('http://localhost:8080/**', blockGateway);
    await runAndWait(page);
    const retry = output(page).getByRole('button', { name: '다시 시도' });
    // The text is also announced through a live region, hence first().
    await expect(output(page).getByText('플레이그라운드 서버에 연결할 수 없어요').first()).toBeVisible();
    await expect(retry).toBeVisible();
    // The work is not lost and can still be edited.
    expect(await editorValue(page)).toBe('출력("다시 연결됨")\n');

    await page.unroute('http://localhost:8080/**', blockGateway);
    const before = await finishedRuns(page);
    await retry.click();
    await expect.poll(() => finishedRuns(page), { timeout: 30_000 }).toBeGreaterThan(before);
    await expect(output(page)).toContainText('실행 완료');
    await expect(output(page)).toContainText('다시 연결됨');
    await expect(retry).toHaveCount(0);
  });
});


/**
 * Output replay after a dropped Run stream. Skipped until the backend implements
 * ExecutionService.ResumeRun; enable with E2E_RESUME_RUN=1.
 *
 * The Run response is fetched in full and handed to the page cut after the
 * first output event, so the client sees the stream end without Finished and
 * must resume with ResumeRun(after_seq) to get the rest.
 */
test.describe('real stack: output replay', { tag: '@stack' }, () => {
  test.skip(!process.env.E2E_RESUME_RUN, 'Backend does not implement ResumeRun yet (set E2E_RESUME_RUN=1 to run)');

  test('a dropped stream is resumed and every line arrives once', async ({ page }) => {
    await page.route('**/playground.api.v1.ExecutionService/Run', async (route) => {
      const response = await route.fetch();
      const body = await response.body();
      // Connect streaming envelopes: 1 flag byte, 4-byte big-endian length, message.
      // Keep the envelopes up to and including the first one with program output
      // (recognised by the printed text), so Finished and later output are missing.
      let offset = 0;
      while (offset + 5 <= body.length) {
        const end = offset + 5 + body.readUInt32BE(offset + 1);
        const hasOutput = body.subarray(offset + 5, end).includes(Buffer.from('줄'));
        offset = end;
        if (hasOutput) break;
      }
      await route.fulfill({ response, body: body.subarray(0, offset) });
    });

    await openPlayground(page);
    await setEditor(page, 'i가 1부터 6까지 {\n    출력("줄", i)\n}\n');
    await runAndWait(page);
    await expect(output(page)).toContainText('실행 완료');
    await expect(output(page).getByRole('note')).toHaveText('다시 연결됨 · 끊긴 사이의 출력도 이어서 받았어요.');
    const text = await output(page).innerText();
    for (let i = 1; i <= 6; i++) expect(text.split(`줄 ${i}`).length - 1).toBe(1);
  });
});
