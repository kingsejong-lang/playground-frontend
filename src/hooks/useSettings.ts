/**
 * Custom hook for managing user settings.
 * Handles editor settings and theme preferences.
 */

import { useState, useEffect, useCallback } from 'react';
import { settingsAPI, EditorSettings, ThemeSettings } from '@/lib/api';
import { extractErrorMessage } from '@/lib/guards';

const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  font_size: 14,
  font_family: 'Fira Code, Monaco, monospace',
  tab_size: 2,
  auto_save: false,
  minimap: true,
  execution_mode: 'http', // Default execution mode
};

const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  theme: 'dark',
  color_scheme: 'vs-dark',
};

interface UseSettingsReturn {
  editorSettings: EditorSettings;
  themeSettings: ThemeSettings;
  error: string | null;
  saveSettings: (editor: EditorSettings, theme: ThemeSettings) => Promise<void>;
  loadSettings: () => Promise<void>;
}

export function useSettings(isAuthenticated: boolean): UseSettingsReturn {
  const [editorSettings, setEditorSettings] = useState<EditorSettings>(DEFAULT_EDITOR_SETTINGS);
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>(DEFAULT_THEME_SETTINGS);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, [isAuthenticated]);

  const loadSettings = useCallback(async () => {
    // Only load settings if user is authenticated
    if (!isAuthenticated) {
      console.log('User not authenticated, using default settings');
      setEditorSettings(DEFAULT_EDITOR_SETTINGS);
      setThemeSettings(DEFAULT_THEME_SETTINGS);
      return;
    }

    try {
      setError(null);
      const settings = await settingsAPI.get();
      setEditorSettings(settings.editor);
      setThemeSettings(settings.theme);
    } catch (err) {
      // If settings don't exist, use defaults
      console.log('No saved settings found, using defaults');
      setEditorSettings(DEFAULT_EDITOR_SETTINGS);
      setThemeSettings(DEFAULT_THEME_SETTINGS);
    }
  }, [isAuthenticated]);

  const saveSettings = useCallback(async (
    editor: EditorSettings,
    theme: ThemeSettings
  ) => {
    // Apply settings locally first
    setEditorSettings(editor);
    setThemeSettings(theme);
    setError(null);

    // Save to backend only if authenticated
    if (!isAuthenticated) {
      console.log('User not authenticated, settings saved locally only');
      return;
    }

    try {
      await settingsAPI.save({
        editor,
        theme,
      });
    } catch (err: unknown) {
      console.error('Failed to save settings:', err);
      setError(extractErrorMessage(err));
    }
  }, [isAuthenticated]);

  return {
    editorSettings,
    themeSettings,
    error,
    saveSettings,
    loadSettings,
  };
}
