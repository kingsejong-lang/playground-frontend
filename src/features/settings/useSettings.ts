/**
 * Editor/theme preferences. Signed-in users load and save them with
 * SettingsService (Get/UpdateSettings); anonymous users keep them in memory.
 * `color_scheme` is not part of the contract and stays local.
 */

import { useState, useEffect, useCallback } from 'react';
import { create } from '@bufbuild/protobuf';
import { FieldMaskSchema } from '@bufbuild/protobuf/wkt';
import { Theme, UpdateSettingsRequestSchema, type Settings } from '@kingsejong-lang/playground-proto';
import { useTranslations } from 'next-intl';
import { assertValid, useRpc } from '@/lib/rpc';
import { z } from '@/lib/zod';
import { useFailureText } from '@/hooks/useFailureText';
import { createLocalStore, useLocalStore } from '@/lib/local-store';

export interface EditorSettings {
  font_size: number;
  font_family: string;
  tab_size: number;
  auto_save: boolean;
  minimap: boolean;
}

export type ColorScheme = 'sanctuary' | 'high-contrast';

export interface ThemeSettings {
  theme: 'dark' | 'light' | 'system';
  /** Editor colours; local only. Legacy values ("vs-dark", "hc-black", ...) are normalised. */
  color_scheme: string;
}

/** Maps stored colour-scheme values (including pre-refresh "vs-*"/"hc-*") to the two supported schemes. */
export function normalizeColorScheme(value: string | undefined): ColorScheme {
  return value === 'high-contrast' || value?.startsWith('hc') ? 'high-contrast' : 'sanctuary';
}

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  font_size: 14,
  font_family: 'Fira Code, Monaco, monospace',
  tab_size: 2,
  auto_save: false,
  minimap: true,
};

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  theme: 'system',
  color_scheme: 'sanctuary',
};

/** Fields this UI owns; others (e.g. locale, word_wrap) are left untouched on the server. */
const UPDATE_PATHS = ['font_size', 'tab_size', 'font_family', 'minimap', 'auto_save', 'theme'];

const THEME_TO_PROTO: Record<ThemeSettings['theme'], Theme> = {
  dark: Theme.DARK,
  light: Theme.LIGHT,
  system: Theme.SYSTEM,
};

export function fromProtoSettings(s: Settings | undefined, colorScheme: string): { editor: EditorSettings; theme: ThemeSettings } {
  // Until the first save the server returns zero values; font_size 0 is never a saved value (min 10).
  if (!s || s.fontSize === 0) return { editor: DEFAULT_EDITOR_SETTINGS, theme: { ...DEFAULT_THEME_SETTINGS, color_scheme: colorScheme } };
  const theme: ThemeSettings['theme'] =
    s.theme === Theme.LIGHT ? 'light' : s.theme === Theme.DARK ? 'dark' : DEFAULT_THEME_SETTINGS.theme;
  return {
    editor: {
      font_size: s.fontSize || DEFAULT_EDITOR_SETTINGS.font_size,
      font_family: s.fontFamily || DEFAULT_EDITOR_SETTINGS.font_family,
      tab_size: s.tabSize || DEFAULT_EDITOR_SETTINGS.tab_size,
      auto_save: s.autoSave,
      minimap: s.minimap,
    },
    theme: { theme, color_scheme: colorScheme },
  };
}

export function toUpdateRequest(editor: EditorSettings, theme: ThemeSettings) {
  return create(UpdateSettingsRequestSchema, {
    settings: {
      fontSize: editor.font_size,
      tabSize: editor.tab_size,
      fontFamily: editor.font_family,
      minimap: editor.minimap,
      autoSave: editor.auto_save,
      theme: THEME_TO_PROTO[theme.theme] ?? Theme.DARK,
    },
    updateMask: create(FieldMaskSchema, { paths: UPDATE_PATHS }),
  });
}

/** Anonymous visitors keep their settings in this browser only (signed-in users sync to the server). */
const LOCAL_SETTINGS_KEY = 'kingsejong-editor-settings';

const LocalSettingsSchema = z.object({
  editor: z.object({
    font_size: z.number().int().min(10).max(32),
    font_family: z.string().max(96),
    tab_size: z.number().int().min(1).max(8),
    auto_save: z.boolean(),
    minimap: z.boolean(),
  }),
  theme: z.object({ theme: z.enum(['dark', 'light', 'system']), color_scheme: z.string().max(32) }),
});

type StoredSettings = { editor: EditorSettings; theme: ThemeSettings };

function parseLocalSettings(raw: string | null): StoredSettings | null {
  if (!raw) return null;
  try {
    const parsed = LocalSettingsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

const localSettingsStore = createLocalStore<StoredSettings | null>(LOCAL_SETTINGS_KEY, parseLocalSettings, null, (v) => JSON.stringify(v));

interface UseSettingsReturn {
  editorSettings: EditorSettings;
  themeSettings: ThemeSettings;
  error: string | null;
  saveSettings: (editor: EditorSettings, theme: ThemeSettings) => Promise<void>;
  /** Fetches the signed-in user's settings again. */
  loadSettings: () => Promise<void>;
}

/**
 * Editor and theme settings. Anonymous visitors keep them in this browser
 * (read with useSyncExternalStore); signed-in users load and save them on the
 * server.
 */
export function useSettings(isAuthenticated: boolean): UseSettingsReturn {
  const api = useRpc();
  const t = useTranslations('errors');
  const failureText = useFailureText();
  const local = useLocalStore(localSettingsStore);
  // Settings of the signed-in user; null until loaded (defaults show meanwhile).
  const [remote, setRemote] = useState<StoredSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** The signed-in user's settings; null when none are saved or the server is unavailable (defaults apply). */
  const fetchRemote = useCallback(
    () =>
      api.settings
        .getSettings({})
        .then(({ settings }): StoredSettings => fromProtoSettings(settings, DEFAULT_THEME_SETTINGS.color_scheme))
        .catch(() => null),
    [api]
  );

  const loadSettings = useCallback(async () => {
    if (!isAuthenticated) return;
    const next = await fetchRemote();
    setRemote(next);
    setError(null);
  }, [fetchRemote, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    void fetchRemote().then((next) => {
      if (cancelled) return;
      setRemote(next);
      setError(null);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchRemote, isAuthenticated]);

  const current = isAuthenticated ? remote : local;

  const saveSettings = useCallback(
    async (editor: EditorSettings, theme: ThemeSettings) => {
      setError(null);
      if (!isAuthenticated) {
        localSettingsStore.set({ editor, theme });
        return;
      }
      // Apply locally first.
      setRemote({ editor, theme });
      try {
        const request = toUpdateRequest(editor, theme);
        assertValid(UpdateSettingsRequestSchema, request);
        await api.settings.updateSettings(request);
      } catch (err: unknown) {
        setError(t('settings', { message: failureText(err) }));
      }
    },
    [api, isAuthenticated, t, failureText]
  );

  return {
    editorSettings: current?.editor ?? DEFAULT_EDITOR_SETTINGS,
    themeSettings: current?.theme ?? DEFAULT_THEME_SETTINGS,
    error,
    saveSettings,
    loadSettings,
  };
}
