import { act, renderHook } from '@testing-library/react';
import { useMediaQuery } from '../useMediaQuery';

describe('useMediaQuery', () => {
  const original = window.matchMedia;
  afterEach(() => {
    window.matchMedia = original;
  });

  it('follows the media query and unsubscribes on unmount', () => {
    let matches = false;
    const listeners = new Set<() => void>();
    window.matchMedia = vi.fn((media: string) => ({
      get matches() {
        return matches;
      },
      media,
      addEventListener: (_: string, l: () => void) => listeners.add(l),
      removeEventListener: (_: string, l: () => void) => listeners.delete(l),
    })) as unknown as typeof window.matchMedia;

    const { result, unmount } = renderHook(() => useMediaQuery('(max-width: 767px)'));
    expect(result.current).toBe(false);
    act(() => {
      matches = true;
      listeners.forEach((l) => l());
    });
    expect(result.current).toBe(true);
    unmount();
    expect(listeners.size).toBe(0);
  });
});
