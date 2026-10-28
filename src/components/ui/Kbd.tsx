/**
 * Keyboard key caps and the platform modifier name.
 *
 * Usage:
 *   const mod = useModifierKey();      // "⌘" on macOS, "Ctrl" elsewhere
 *   <Kbd>{mod}</Kbd><Kbd>Enter</Kbd>
 */
'use client';

import { useSyncExternalStore, type ReactNode } from 'react';

const subscribe = () => () => {};

/** "⌘" on Apple platforms, "Ctrl" elsewhere (and during server rendering). */
export function useModifierKey(): string {
  return useSyncExternalStore(
    subscribe,
    () => (/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'),
    () => 'Ctrl'
  );
}

export function Kbd({ children, className = '' }: { children: ReactNode; className?: string }) {
  // The ⌘ glyph is tiny in monospace faces; draw it in the UI sans at body size.
  const symbol = children === '⌘';
  return (
    <kbd
      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-hair bg-void px-1.5 leading-none text-fg-secondary ${
        symbol ? 'font-sans text-sm' : 'font-mono text-[13px]'
      } ${className}`}
    >
      {children}
    </kbd>
  );
}

/** A key combination such as ⌘ + Enter, rendered as separate caps. */
export function KeyCombo({ keys, className = '' }: { keys: string[]; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {keys.map((k) => (
        <Kbd key={k}>{k}</Kbd>
      ))}
    </span>
  );
}
