'use client';

/**
 * Context menu for a file (tab or file-list row): set as entry file, rename, close/delete.
 * Opens on right-click, the ContextMenu key or Shift+F10; it is a native popover,
 * so Esc and clicking elsewhere close it.
 *
 * Usage:
 *   const menu = useFileMenu();
 *   <button onContextMenu={(e) => menu.open(e, file.id)} … />
 *   <FileMenu menu={menu} … />
 */
import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Pencil, Play, Trash2 } from 'lucide-react';

interface MenuState {
  fileId: string;
  x: number;
  y: number;
}

export function useFileMenu() {
  const [state, setState] = useState<MenuState | null>(null);
  const open = useCallback((e: MouseEvent<HTMLElement>, fileId: string) => {
    e.preventDefault();
    // Keyboard-opened menus report 0,0: anchor them to the element instead.
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX || rect.left;
    const y = e.clientY || rect.bottom;
    setState({ fileId, x, y });
  }, []);
  const close = useCallback(() => setState(null), []);
  return { state, open, close };
}

interface FileMenuProps {
  menu: ReturnType<typeof useFileMenu>;
  entryFileId: string | null;
  fileName: (id: string) => string;
  onSetEntry: (id: string) => void;
  onRename: (id: string) => void;
  onRemove: (id: string) => void;
  removeLabel: string;
}

export function FileMenu({ menu, entryFileId, fileName, onSetEntry, onRename, onRemove, removeLabel }: FileMenuProps) {
  const t = useTranslations('files');
  const tc = useTranslations('common');
  const ref = useRef<HTMLDivElement>(null);
  const { state, close } = menu;

  useEffect(() => {
    const el = ref.current;
    if (!el || !state) return;
    try {
      el.showPopover();
    } catch {
      // Popover API unavailable: the element still renders (absolutely positioned).
    }
    el.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  }, [state]);

  if (!state) return null;
  const item =
    'flex h-9 w-full items-center gap-3 rounded-md px-3 text-left text-sm text-fg-secondary hover:bg-hover hover:text-fg disabled:opacity-50 disabled:hover:bg-transparent';
  const act = (fn: (id: string) => void) => () => {
    ref.current?.hidePopover?.();
    close();
    fn(state.fileId);
  };

  return (
    <div
      ref={ref}
      popover="auto"
      onToggle={(e) => {
        if ((e as unknown as ToggleEvent).newState === 'closed') close();
      }}
      aria-label={t('menu', { name: fileName(state.fileId) })}
      className="fixed m-0 w-56 rounded-lg border border-hair bg-raised p-1.5 text-fg shadow-raised"
      style={{ inset: 'auto', left: Math.min(state.x, window.innerWidth - 232), top: Math.min(state.y, window.innerHeight - 140) }}
    >
      <button type="button" className={item} onClick={act(onSetEntry)} disabled={entryFileId === state.fileId}>
        <Play className="size-4 shrink-0 text-accent-text" aria-hidden="true" />
        {t('setEntry')}
      </button>
      <button type="button" className={item} onClick={act(onRename)}>
        <Pencil className="size-4 shrink-0 text-fg-muted" aria-hidden="true" />
        {tc('rename')}
      </button>
      <button type="button" className={item} onClick={act(onRemove)}>
        <Trash2 className="size-4 shrink-0 text-fg-muted" aria-hidden="true" />
        {removeLabel}
      </button>
    </div>
  );
}
