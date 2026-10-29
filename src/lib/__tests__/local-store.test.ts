import { act, renderHook } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { createLocalStore, useLocalStore } from '../local-store';

const parse = (raw: string | null) => (raw ? (JSON.parse(raw) as { n: number }) : { n: 0 });

beforeEach(() => localStorage.clear());

describe('createLocalStore', () => {
  it('returns the same object while the stored text is unchanged', () => {
    const store = createLocalStore('k1', parse, { n: 0 });
    localStorage.setItem('k1', '{"n":1}');
    const first = store.getSnapshot();
    expect(first).toEqual({ n: 1 });
    expect(store.getSnapshot()).toBe(first);
    localStorage.setItem('k1', '{"n":2}');
    expect(store.getSnapshot()).toEqual({ n: 2 });
  });

  it('re-renders subscribers on set, and on storage events from other tabs', () => {
    const store = createLocalStore('k2', parse, { n: 0 });
    const { result } = renderHook(() => useLocalStore(store));
    expect(result.current).toEqual({ n: 0 });
    act(() => store.set({ n: 3 }));
    expect(result.current).toEqual({ n: 3 });
    expect(localStorage.getItem('k2')).toBe('{"n":3}');
    act(() => {
      localStorage.setItem('k2', '{"n":4}');
      window.dispatchEvent(new StorageEvent('storage', { key: 'k2' }));
    });
    expect(result.current).toEqual({ n: 4 });
  });

  it('keeps the value in memory when storage refuses writes', () => {
    const store = createLocalStore('k3', parse, { n: 0 });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    store.set({ n: 5 });
    expect(store.getSnapshot()).toEqual({ n: 5 });
    setItem.mockRestore();
    store.set({ n: 6 });
    expect(localStorage.getItem('k3')).toBe('{"n":6}');
  });

  it('renders the fallback on the server, so hydration matches', () => {
    localStorage.setItem('k4', '{"n":9}');
    const store = createLocalStore('k4', parse, { n: 0 });
    function Show() {
      return createElement('span', null, String(useLocalStore(store).n));
    }
    expect(renderToString(createElement(Show))).toBe('<span>0</span>');
  });
});
