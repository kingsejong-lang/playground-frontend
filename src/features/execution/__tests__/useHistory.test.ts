import { act, renderHook } from '@testing-library/react';
import { emptyResult } from '@/lib/rpc/run-stream';
import { useHistory } from '../useHistory';
import { addHistoryItem } from '../history';

const ok = { ...emptyResult(), status: 'succeeded' as const, success: true, chunks: [{ stream: 'stdout' as const, text: 'hello\n' }] };
const failed = { ...emptyResult(), status: 'failed' as const, success: false };

beforeEach(() => localStorage.clear());

function seed() {
  addHistoryItem({ language: 'python', code: 'print("hello")', output: ok, success: true });
  addHistoryItem({ language: 'kingsejong', code: '출력(1)', output: ok, success: true });
  addHistoryItem({ language: 'python', code: 'raise Error', output: failed, success: false });
}

describe('useHistory', () => {
  it('reads stored runs, newest first, with stats', () => {
    seed();
    const { result } = renderHook(() => useHistory());
    expect(result.current.items.map((i) => i.code)).toEqual(['raise Error', '출력(1)', 'print("hello")']);
    expect(result.current.stats).toMatchObject({ total: 3, successful: 2, failed: 1 });
  });

  it('starts empty and filters by text, language and result', () => {
    const { result } = renderHook(() => useHistory());
    expect(result.current.items).toEqual([]);
    act(() => seed());
    expect(result.current.items).toHaveLength(3);
    act(() => result.current.setSearchQuery('print'));
    expect(result.current.filteredItems.map((i) => i.code)).toEqual(['print("hello")']);
    act(() => {
      result.current.setSearchQuery('');
      result.current.setSelectedLanguage('python');
      result.current.setSelectedStatus('failed');
    });
    expect(result.current.filteredItems.map((i) => i.code)).toEqual(['raise Error']);
    act(() => result.current.setSelectedStatus('success'));
    expect(result.current.filteredItems.map((i) => i.code)).toEqual(['print("hello")']);
  });

  it('adds, deletes and clears, and every hook instance sees the change', () => {
    const a = renderHook(() => useHistory());
    const b = renderHook(() => useHistory());
    let id = '';
    act(() => {
      id = a.result.current.addItem({ language: 'go', code: 'package main', output: ok, success: true }).id;
    });
    expect(b.result.current.items.map((i) => i.id)).toEqual([id]);
    act(() => a.result.current.deleteItem(id));
    expect(b.result.current.items).toEqual([]);
    act(() => seed());
    act(() => b.result.current.clearAll());
    expect(a.result.current.items).toEqual([]);
  });

  it('imports and exports JSON', () => {
    seed();
    const { result } = renderHook(() => useHistory());
    const json = JSON.stringify(result.current.items.map((i) => ({ ...i, id: `${i.id}-x`, code: `${i.code} x` })));
    act(() => result.current.importFromJson(json));
    expect(result.current.items).toHaveLength(6);
    const createObjectURL = vi.fn(() => 'blob:x');
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    result.current.exportToJson();
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });

  it('picks up changes made in another tab', () => {
    const { result } = renderHook(() => useHistory());
    act(() => {
      seed(); // written without going through this hook
      window.dispatchEvent(new StorageEvent('storage', { key: 'playground_execution_history' }));
    });
    expect(result.current.items).toHaveLength(3);
  });
});
