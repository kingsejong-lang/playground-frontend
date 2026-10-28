/**
 * The only global keyboard shortcuts. Everything else (templates, history,
 * settings, share, layout, theme, format, ...) lives in the header menu and in
 * the editor's command palette (F1), so no browser or OS key is taken over.
 *
 * - Mod+Enter  run (Mod = ⌘ on macOS, Ctrl elsewhere)
 * - Mod+.      stop a run. Chosen over Esc because Esc already closes dialogs,
 *              suggestions and find in the editor; ⌘. is the conventional
 *              "cancel" on macOS and no browser reserves Ctrl+. or ⌘.
 * - Mod+S      save a local draft (no network); replaces the browser's
 *              "save page" which is never useful here.
 * - ?          shortcut help, outside text fields only.
 */
export interface ShortcutDef {
  key: string;
  mod: boolean;
  shift?: boolean;
}

export const GLOBAL_SHORTCUTS = {
  run: { key: 'Enter', mod: true },
  stop: { key: '.', mod: true },
  save: { key: 's', mod: true },
  help: { key: '?', mod: false },
} as const satisfies Record<string, ShortcutDef>;

/** Key caps for display, e.g. ["⌘", "Enter"]. */
export function shortcutKeys(def: ShortcutDef, modKey: string): string[] {
  const keys: string[] = [];
  if (def.mod) keys.push(modKey);
  if (def.shift) keys.push('Shift');
  keys.push(def.key.length === 1 ? def.key.toUpperCase() : def.key);
  return keys;
}
