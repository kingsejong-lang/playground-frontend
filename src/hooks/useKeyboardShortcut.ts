/**
 * Custom hook for keyboard shortcuts.
 * Supports Ctrl/Cmd, Shift, Alt modifiers.
 */

import { useEffect, useCallback } from 'react';

export interface KeyboardShortcutOptions {
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  enabled?: boolean;
}

type ShortcutHandler = (e: KeyboardEvent) => void;

/** True when the key press is text entry: inputs, textareas, contenteditable and Monaco. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest('.monaco-editor')) return true;
  if (target instanceof HTMLElement && target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

/**
 * Register a keyboard shortcut handler.
 *
 * @param key - The key to listen for (e.g., 'Enter', 's', 'k')
 * @param handler - Function to call when shortcut is triggered
 * @param options - Modifier keys and enabled state
 *
 * @example
 * // Ctrl/Cmd + Enter
 * useKeyboardShortcut('Enter', handleRun, { ctrl: true });
 *
 * // Ctrl/Cmd + Shift + Enter
 * useKeyboardShortcut('Enter', handleRunStream, { ctrl: true, shift: true });
 *
 * // Ctrl/Cmd + K
 * useKeyboardShortcut('k', handleClear, { ctrl: true });
 */
export function useKeyboardShortcut(
  key: string,
  handler: ShortcutHandler,
  options: KeyboardShortcutOptions = {}
) {
  const { ctrl = false, shift = false, alt = false, enabled = true } = options;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;
      // Shortcuts without Ctrl/Cmd or Alt (e.g. "?") must not swallow typing.
      if (!ctrl && !alt && isEditableTarget(e.target)) return;

      // Use metaKey for Mac (Cmd), ctrlKey for Windows/Linux
      const ctrlKey = navigator.platform.includes('Mac') ? e.metaKey : e.ctrlKey;

      // Check if all required modifiers match
      const ctrlMatch = !ctrl || ctrlKey;
      const shiftMatch = !shift || e.shiftKey;
      const altMatch = !alt || e.altKey;

      // Check if no extra modifiers are pressed
      const noExtraCtrl = ctrl || !ctrlKey;
      const noExtraShift = shift || !e.shiftKey;
      const noExtraAlt = alt || !e.altKey;

      if (
        e.key === key &&
        ctrlMatch &&
        shiftMatch &&
        altMatch &&
        noExtraCtrl &&
        noExtraShift &&
        noExtraAlt
      ) {
        e.preventDefault();
        handler(e);
      }
    },
    [key, handler, ctrl, shift, alt, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);
}
