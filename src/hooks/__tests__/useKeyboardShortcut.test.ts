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
