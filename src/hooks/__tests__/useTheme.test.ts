import { renderHook, act } from '@testing-library/react';
import { useTheme } from '../useTheme';

describe('useTheme', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset matchMedia mock
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  });

  it('should initialize with system theme by default', () => {
    const { result } = renderHook(() => useTheme());
    
    expect(result.current.theme).toBe('system');
    expect(result.current.resolvedTheme).toBe('dark');
  });

  it('should toggle theme from dark to light', () => {
    const { result } = renderHook(() => useTheme());
    
    act(() => {
      result.current.toggleTheme();
    });
    
    expect(result.current.theme).toBe('light');
    expect(result.current.resolvedTheme).toBe('light');
  });

  it('should toggle theme from light to dark', () => {
    const { result } = renderHook(() => useTheme());
    
    // First toggle to light
    act(() => {
      result.current.toggleTheme();
    });
    
    // Then toggle back to dark
    act(() => {
      result.current.toggleTheme();
    });
    
    expect(result.current.theme).toBe('dark');
    expect(result.current.resolvedTheme).toBe('dark');
  });

  it('should set specific theme', () => {
    const { result } = renderHook(() => useTheme());
    
    act(() => {
      result.current.setTheme('light');
    });
    
    expect(result.current.theme).toBe('light');
    expect(result.current.resolvedTheme).toBe('light');
  });

  it('should persist theme to localStorage', () => {
    const { result } = renderHook(() => useTheme());
    
    act(() => {
      result.current.setTheme('light');
    });
    
    expect(localStorage.getItem('kingsejong-theme')).toBe('light');
  });

  it('should load theme from localStorage', () => {
    localStorage.setItem('kingsejong-theme', 'light');
    
    const { result } = renderHook(() => useTheme());
    
    // Wait for useEffect to run
    expect(result.current.theme).toBe('light');
  });

  it('should apply theme class to document', () => {
    const { result } = renderHook(() => useTheme());
    
    act(() => {
      result.current.setTheme('light');
    });
    
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
