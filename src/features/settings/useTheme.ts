/**
 * Theme (dark / light / system), stored in localStorage.
 *
 * The stored choice and the system preference are read with
 * useSyncExternalStore; public/theme-init.js applies the class before the
 * first paint, and this hook keeps <html> in sync afterwards.
 *
 * Usage:
 *   const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
 */

'use client';

import { useCallback, useEffect } from 'react';
import { STORAGE_KEYS } from '@/lib/constants';
import { createLocalStore, useLocalStore } from '@/lib/local-store';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface UseThemeReturn {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const themeStore = createLocalStore<Theme>(
  STORAGE_KEYS.THEME,
  (raw) => (raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system'),
  'system',
  (theme) => theme
);

/** Puts the theme class on <html>. */
function applyTheme(resolvedTheme: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle('dark', resolvedTheme === 'dark');
  root.classList.toggle('light', resolvedTheme === 'light');
}

export function useTheme(): UseThemeReturn {
  const theme = useLocalStore(themeStore);
  // Dark is the server-side assumption, matching theme-init.js when storage is blocked.
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)', true);
  const resolvedTheme: ResolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  useEffect(() => applyTheme(resolvedTheme), [resolvedTheme]);

  const setTheme = useCallback((next: Theme) => themeStore.set(next), []);
  const toggleTheme = useCallback(() => themeStore.set(resolvedTheme === 'dark' ? 'light' : 'dark'), [resolvedTheme]);

  return { theme, resolvedTheme, setTheme, toggleTheme };
}
