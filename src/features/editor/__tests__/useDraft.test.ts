import { act, renderHook } from '@testing-library/react';
import { useDraft, type DraftInput } from '../useDraft';
import { loadDraft } from '../drafts';

const input = (content: string, autoSave: boolean): DraftInput => ({
  languageId: 'kingsejong',
  files: [{ name: 'main.ksj', content }],
  entry: 'main.ksj',
  active: 'main.ksj',
  autoSave,
});

describe('useDraft', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('saves on demand (Mod+S) and reports the time', () => {
    const { result } = renderHook((p: DraftInput) => useDraft(p), { initialProps: input('출력(1)', false) });
    expect(result.current.lastSavedAt).toBeNull();
    act(() => {
      result.current.saveNow();
    });
    expect(loadDraft('kingsejong')?.files[0].content).toBe('출력(1)');
    expect(result.current.lastSavedAt).not.toBeNull();
  });

  it('auto-saves after edits settle when auto-save is on', () => {
    const { rerender } = renderHook((p: DraftInput) => useDraft(p), { initialProps: input('a', true) });
    rerender(input('ab', true));
    rerender(input('abc', true));
    expect(loadDraft('kingsejong')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(loadDraft('kingsejong')?.files[0].content).toBe('abc');
  });

  it('does not auto-save when the setting is off', () => {
    const { rerender } = renderHook((p: DraftInput) => useDraft(p), { initialProps: input('a', false) });
    rerender(input('ab', false));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(loadDraft('kingsejong')).toBeNull();
  });

  it('does not save one language\'s files under another language when the language switches', () => {
    const { rerender } = renderHook((p: DraftInput) => useDraft(p), { initialProps: input('출력(1)', true) });
    rerender({ ...input('출력(1)', true), languageId: 'python' });
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(loadDraft('python')).toBeNull();
  });
});
