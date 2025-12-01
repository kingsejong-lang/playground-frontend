const { renderHook, act } = require('@testing-library/react');
import { useLayout } from '../useLayout';

describe('useLayout', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should initialize with default settings', () => {
    const { result } = renderHook(() => useLayout());
    
    expect(result.current.orientation).toBe('horizontal');
    expect(result.current.editorSize).toBe(50);
    expect(result.current.outputSize).toBe(50);
  });

  it('should toggle orientation from horizontal to vertical', () => {
    const { result } = renderHook(() => useLayout());
    
    act(() => {
      result.current.toggleOrientation();
    });
    
    expect(result.current.orientation).toBe('vertical');
  });

  it('should toggle orientation from vertical to horizontal', () => {
    const { result } = renderHook(() => useLayout());
    
    act(() => {
      result.current.toggleOrientation();
      result.current.toggleOrientation();
    });
    
    expect(result.current.orientation).toBe('horizontal');
  });

  it('should set specific orientation', () => {
    const { result } = renderHook(() => useLayout());
    
    act(() => {
      result.current.setOrientation('vertical');
    });
    
    expect(result.current.orientation).toBe('vertical');
  });

  it('should set panel sizes', () => {
    const { result } = renderHook(() => useLayout());
    
    act(() => {
      result.current.setPanelSizes(60, 40);
    });
    
    expect(result.current.editorSize).toBe(60);
    expect(result.current.outputSize).toBe(40);
  });

  it('should clamp panel sizes to min/max bounds', () => {
    const { result } = renderHook(() => useLayout());
    
    act(() => {
      result.current.setPanelSizes(5, 95);
    });
    
    expect(result.current.editorSize).toBe(10); // clamped to min 10
    expect(result.current.outputSize).toBe(90); // clamped to max 90
  });

  it('should persist layout to localStorage', () => {
    const { result } = renderHook(() => useLayout());
    
    act(() => {
      result.current.setOrientation('vertical');
      result.current.setPanelSizes(60, 40);
    });
    
    const stored = JSON.parse(localStorage.getItem('kingsejong-layout') || '{}');
    expect(stored.orientation).toBe('vertical');
    expect(stored.editorSize).toBe(60);
    expect(stored.outputSize).toBe(40);
  });

  it('should load layout from localStorage', () => {
    const layoutData = {
      orientation: 'vertical',
      editorSize: 70,
      outputSize: 30,
    };
    localStorage.setItem('kingsejong-layout', JSON.stringify(layoutData));
    
    const { result } = renderHook(() => useLayout());
    
    expect(result.current.orientation).toBe('vertical');
    expect(result.current.editorSize).toBe(70);
    expect(result.current.outputSize).toBe(30);
  });

  it('should reset layout to defaults', () => {
    const { result } = renderHook(() => useLayout());
    
    act(() => {
      result.current.setOrientation('vertical');
      result.current.setPanelSizes(70, 30);
    });
    
    act(() => {
      result.current.resetLayout();
    });
    
    expect(result.current.orientation).toBe('horizontal');
    expect(result.current.editorSize).toBe(50);
    expect(result.current.outputSize).toBe(50);
  });
});
