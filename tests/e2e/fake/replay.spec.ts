/**
 * Dropped Run streams against the fake backend: ResumeRun replay, the
 * ReplayGap notice and the GetExecution fallback.
 */
import { expect, test } from '@playwright/test';
import { openPlayground, output, runAndWait, setEditor } from '../helpers';

const program = '출력("하나")\n출력("둘")\n';

test('a dropped stream is resumed and the missed output is replayed', async ({ page }) => {
  await openPlayground(page, '?fake=drop');
  await setEditor(page, program);
  await runAndWait(page);
  await expect(output(page)).toContainText('실행 완료');
  await expect(output(page)).toContainText('첫 줄은 도착했습니다');
  await expect(output(page)).toContainText('하나');
  await expect(output(page)).toContainText('둘');
  await expect(output(page).getByRole('note')).toHaveText('다시 연결됨 · 끊긴 사이의 출력도 이어서 받았어요.');
});

test('events the server no longer has are reported', async ({ page }) => {
  await openPlayground(page, '?fake=drop_gap');
  await setEditor(page, program);
  await runAndWait(page);
  await expect(output(page)).toContainText('실행 완료');
  await expect(output(page).getByRole('note')).toHaveText(/이벤트 2개/);
  await expect(output(page)).not.toContainText('하나');
});

for (const mode of ['drop_noreplay', 'drop_legacy']) {
  test(`without replay (${mode}) the final status still arrives`, async ({ page }) => {
    await openPlayground(page, `?fake=${mode}`);
    await setEditor(page, program);
    await runAndWait(page);
    await expect(output(page)).toContainText('실행 완료');
    await expect(output(page).getByRole('note')).toHaveText(/최종 상태만 다시 받아 왔어요/);
  });
}
