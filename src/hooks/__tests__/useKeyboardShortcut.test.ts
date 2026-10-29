import { renderHook } from '@testing-library/react';
import { isEditableTarget, useKeyboardShortcut } from '../useKeyboardShortcut';

function press(target: EventTarget, key: string, init: KeyboardEventInit = {}) {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));
}

describe('useKeyboardShortcut', () => {
  it('fires a bare-key shortcut outside text fields', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcut('?', handler));
    press(document.body, '?');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not steal a bare key typed into an input or the code editor', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcut('?', handler));
    const input = document.createElement('input');
    const editor = document.createElement('div');
    editor.className = 'monaco-editor';
    const textarea = document.createElement('textarea');
    editor.appendChild(textarea);
    document.body.append(input, editor);
    press(input, '?');
    press(textarea, '?');
    expect(handler).not.toHaveBeenCalled();
    input.remove();
    editor.remove();
  });

  it('still fires modifier shortcuts inside text fields', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcut('Enter', handler, { ctrl: true }));
    const input = document.createElement('textarea');
    document.body.append(input);
    press(input, 'Enter', { ctrlKey: true, metaKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
    input.remove();
  });

  it('recognises editable targets', () => {
    expect(isEditableTarget(document.createElement('select'))).toBe(true);
    expect(isEditableTarget(document.createElement('button'))).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
});

describe('useKeyboardShortcut modifiers', () => {
  const press = (init: KeyboardEventInit) => window.dispatchEvent(new KeyboardEvent('keydown', { cancelable: true, ...init }));
  afterEach(() => Object.defineProperty(navigator, 'platform', { value: '', configurable: true }));

  it('uses Cmd on macOS and Ctrl elsewhere', () => {
    const handler = vi.fn();
    Object.defineProperty(navigator, 'platform', { value: 'MacIntel', configurable: true });
    const { unmount } = renderHook(() => useKeyboardShortcut('Enter', handler, { ctrl: true }));
    press({ key: 'Enter', ctrlKey: true });
    expect(handler).not.toHaveBeenCalled();
    press({ key: 'Enter', metaKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
    unmount();
    Object.defineProperty(navigator, 'platform', { value: 'Linux x86_64', configurable: true });
    renderHook(() => useKeyboardShortcut('Enter', handler, { ctrl: true }));
    press({ key: 'Enter', ctrlKey: true });
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('requires the exact modifier set and prevents the default action', () => {
    const handler = vi.fn((e: KeyboardEvent) => expect(e.defaultPrevented).toBe(true));
    renderHook(() => useKeyboardShortcut('k', handler, { ctrl: true, shift: true }));
    press({ key: 'k', ctrlKey: true });
    press({ key: 'k', ctrlKey: true, shiftKey: true, altKey: true });
    expect(handler).not.toHaveBeenCalled();
    press({ key: 'k', ctrlKey: true, shiftKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('matches Alt shortcuts and ignores a bare key held with a modifier', () => {
    const alt = vi.fn();
    const bare = vi.fn();
    renderHook(() => useKeyboardShortcut('n', alt, { alt: true }));
    renderHook(() => useKeyboardShortcut('?', bare));
    press({ key: 'n', altKey: true });
    press({ key: '?', ctrlKey: true });
    press({ key: '?', altKey: true });
    expect(alt).toHaveBeenCalledTimes(1);
    expect(bare).not.toHaveBeenCalled();
  });

  it('does nothing while disabled', () => {
    const handler = vi.fn();
    const { rerender } = renderHook(({ enabled }) => useKeyboardShortcut('?', handler, { enabled }), { initialProps: { enabled: false } });
    press({ key: '?' });
    expect(handler).not.toHaveBeenCalled();
    rerender({ enabled: true });
    press({ key: '?' });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
