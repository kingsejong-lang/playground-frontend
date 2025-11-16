import { useState, useEffect } from 'react';
import { EditorSettings, ThemeSettings } from '@/lib/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (editor: EditorSettings, theme: ThemeSettings) => void;
  initialEditor?: EditorSettings;
  initialTheme?: ThemeSettings;
}

const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  font_size: 14,
  font_family: 'Fira Code, Monaco, monospace',
  tab_size: 2,
  auto_save: false,
  minimap: true,
  execution_mode: 'http',
};

const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  theme: 'dark',
  color_scheme: 'vs-dark',
};

export default function SettingsModal({
  isOpen,
  onClose,
  onSave,
  initialEditor,
  initialTheme,
}: SettingsModalProps) {
  const [editorSettings, setEditorSettings] = useState<EditorSettings>(
    initialEditor || DEFAULT_EDITOR_SETTINGS
  );
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>(
    initialTheme || DEFAULT_THEME_SETTINGS
  );

  useEffect(() => {
    if (initialEditor) setEditorSettings(initialEditor);
    if (initialTheme) setThemeSettings(initialTheme);
  }, [initialEditor, initialTheme]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(editorSettings, themeSettings);
    onClose();
  };

  const handleReset = () => {
    setEditorSettings(DEFAULT_EDITOR_SETTINGS);
    setThemeSettings(DEFAULT_THEME_SETTINGS);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="dialog"
      aria-labelledby="settings-modal-title"
      aria-modal="true"
    >
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 id="settings-modal-title" className="text-xl font-bold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close settings modal"
          >
            ✕
          </button>
        </div>

        {/* Editor Settings */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Editor Settings</h3>
          <div className="space-y-4">
            {/* Font Size */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Font Size: {editorSettings.font_size}px
              </label>
              <input
                type="range"
                min="10"
                max="24"
                value={editorSettings.font_size}
                onChange={(e) =>
                  setEditorSettings({ ...editorSettings, font_size: Number(e.target.value) })
                }
                className="w-full"
              />
            </div>

            {/* Font Family */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Font Family
              </label>
              <select
                value={editorSettings.font_family}
                onChange={(e) =>
                  setEditorSettings({ ...editorSettings, font_family: e.target.value })
                }
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="Fira Code, Monaco, monospace">Fira Code</option>
                <option value="Monaco, monospace">Monaco</option>
                <option value="Consolas, monospace">Consolas</option>
                <option value="'Courier New', monospace">Courier New</option>
                <option value="monospace">System Monospace</option>
              </select>
            </div>

            {/* Tab Size */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tab Size: {editorSettings.tab_size} spaces
              </label>
              <input
                type="range"
                min="2"
                max="8"
                step="2"
                value={editorSettings.tab_size}
                onChange={(e) =>
                  setEditorSettings({ ...editorSettings, tab_size: Number(e.target.value) })
                }
                className="w-full"
              />
            </div>

            {/* Auto Save */}
            <div className="flex items-center justify-between">
              <label htmlFor="auto-save-toggle" className="text-sm font-medium text-gray-300">Auto Save</label>
              <button
                id="auto-save-toggle"
                onClick={() =>
                  setEditorSettings({ ...editorSettings, auto_save: !editorSettings.auto_save })
                }
                role="switch"
                aria-checked={editorSettings.auto_save}
                aria-label="Toggle auto save"
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  editorSettings.auto_save ? 'bg-blue-600' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    editorSettings.auto_save ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Minimap */}
            <div className="flex items-center justify-between">
              <label htmlFor="minimap-toggle" className="text-sm font-medium text-gray-300">Show Minimap</label>
              <button
                id="minimap-toggle"
                onClick={() =>
                  setEditorSettings({ ...editorSettings, minimap: !editorSettings.minimap })
                }
                role="switch"
                aria-checked={editorSettings.minimap}
                aria-label="Toggle minimap display"
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  editorSettings.minimap ? 'bg-blue-600' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    editorSettings.minimap ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Execution Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Execution Mode
              </label>
              <select
                value={editorSettings.execution_mode || 'http'}
                onChange={(e) =>
                  setEditorSettings({ ...editorSettings, execution_mode: e.target.value as 'http' | 'websocket' })
                }
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="http">HTTP (Recommended)</option>
                <option value="websocket">WebSocket (Real-time)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                HTTP is more stable. WebSocket provides real-time streaming but may have connection issues.
              </p>
            </div>
          </div>
        </div>

        {/* Theme Settings */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Theme Settings</h3>
          <div className="space-y-4">
            {/* Theme */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Theme</label>
              <select
                value={themeSettings.theme}
                onChange={(e) => setThemeSettings({ ...themeSettings, theme: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </div>

            {/* Color Scheme */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Editor Color Scheme
              </label>
              <select
                value={themeSettings.color_scheme}
                onChange={(e) =>
                  setThemeSettings({ ...themeSettings, color_scheme: e.target.value })
                }
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="vs-dark">VS Dark</option>
                <option value="vs-light">VS Light</option>
                <option value="hc-black">High Contrast Black</option>
                <option value="hc-light">High Contrast Light</option>
              </select>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
            aria-label="Reset all settings to default values"
          >
            Reset to Default
          </button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
            aria-label="Cancel and close settings"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            aria-label="Save settings and close"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
