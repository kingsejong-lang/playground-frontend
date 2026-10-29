import { act, renderHook } from '@testing-library/react';
import { useSnippets } from '../useSnippets';

const base = { description: '', code: '출력(1)', language: 'kingsejong', tags: [] as string[], isFavorite: false };

describe('useSnippets', () => {
  beforeEach(() => localStorage.clear());

  it('adds sanitized snippets and persists them', () => {
    const { result } = renderHook(() => useSnippets());
    act(() => result.current.addSnippet({ ...base, title: '  인사\u0000 ', tags: [' 기본 ', ''] }));
    expect(result.current.snippets[0]).toMatchObject({ title: '인사', tags: ['기본'] });
    const again = renderHook(() => useSnippets());
    expect(again.result.current.snippets).toHaveLength(1);
  });

  it('rejects a missing title, empty code and oversized code', () => {
    const { result } = renderHook(() => useSnippets());
    expect(() => result.current.addSnippet({ ...base, title: '   ' })).toThrow('title is required');
    expect(() => result.current.addSnippet({ ...base, title: 't', code: '  ' })).toThrow('code is required');
    expect(() => result.current.addSnippet({ ...base, title: 't', code: 'a'.repeat(600 * 1024) })).toThrow('too large');
  });

  it('updates, toggles favorites, filters and searches', () => {
    const { result } = renderHook(() => useSnippets());
    act(() => {
      result.current.addSnippet({ ...base, title: '반복문', tags: ['loop'] });
      result.current.addSnippet({ ...base, title: '함수', code: '함수(x) {}' });
    });
    const [loop, fn] = result.current.snippets;
    act(() => result.current.toggleFavorite(fn.id));
    act(() => result.current.setFilter('favorites'));
    expect(result.current.filteredSnippets.map((s) => s.title)).toEqual(['함수']);
    act(() => {
      result.current.setFilter('all');
      result.current.setSearchQuery('LOOP');
    });
    expect(result.current.filteredSnippets.map((s) => s.title)).toEqual(['반복문']);
    act(() => result.current.updateSnippet(loop.id, { title: '범위 반복' }));
    expect(result.current.getSnippet(loop.id)?.title).toBe('범위 반복');
  });

  it('exports, imports valid entries and rejects invalid data', () => {
    const { result } = renderHook(() => useSnippets());
    act(() => result.current.addSnippet({ ...base, title: 'a' }));
    const json = result.current.exportSnippets();
    act(() => result.current.clearAll());
    expect(result.current.snippets).toEqual([]);
    act(() => result.current.importSnippets(json));
    expect(result.current.snippets.map((s) => s.title)).toEqual(['a']);
    expect(() => result.current.importSnippets('{"not":"array"}')).toThrow('Invalid snippet data');
    expect(() => result.current.importSnippets('nope')).toThrow('Invalid snippet data');
  });

  it('deletes snippets and survives corrupt storage', () => {
    localStorage.setItem('kingsejong-snippets', '{bad json');
    const { result } = renderHook(() => useSnippets());
    expect(result.current.snippets).toEqual([]);
    act(() => result.current.addSnippet({ ...base, title: 'x' }));
    act(() => result.current.deleteSnippet(result.current.snippets[0].id));
    expect(result.current.snippets).toEqual([]);
  });
});
