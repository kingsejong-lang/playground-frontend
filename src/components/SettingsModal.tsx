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

  const handleSave = () => {
    onSave(editorSettings, themeSettings);
    onClose();
  };

  const handleReset = () => {
    setEditorSettings(DEFAULT_EDITOR_SETTINGS);
    setThemeSettings(DEFAULT_THEME_SETTINGS);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      role="dialog"
      aria-labelledby="settings-modal-title"
      aria-modal="true"
    >
      <div className="rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'var(--editor-zone)', border: '1px solid var(--border-hair)' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 id="settings-modal-title" className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Settings</h2>
          <button
            onClick={onClose}
            className="transition-colors"
            style={{ color: 'var(--text-whisper)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-whisper)'}
            aria-label="Close settings modal"
          >
            ✕
          </button>
        </div>

        {/* Editor Settings */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Editor Settings</h3>
          <div className="space-y-4">
            {/* Font Size */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
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
                style={{
                  accentColor: 'var(--accent-indigo)'
                }}
              />
            </div>

            {/* Font Family */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Font Family
              </label>
              <select
                value={editorSettings.font_family}
                onChange={(e) =>
                  setEditorSettings({ ...editorSettings, font_family: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-void)',
                  border: '1px solid var(--border-hair)',
                  color: 'var(--text-primary)'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent-indigo)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-hair)'}
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
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
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
                style={{
                  accentColor: 'var(--accent-indigo)'
                }}
              />
            </div>

            {/* Auto Save */}
            <div className="flex items-center justify-between">
              <label htmlFor="auto-save-toggle" className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Auto Save</label>
              <button
                id="auto-save-toggle"
                onClick={() =>
                  setEditorSettings({ ...editorSettings, auto_save: !editorSettings.auto_save })
                }
                role="switch"
                aria-checked={editorSettings.auto_save}
                aria-label="Toggle auto save"
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                style={{
                  backgroundColor: editorSettings.auto_save ? 'var(--accent-indigo)' : 'var(--border-hair)'
                }}
              >
                <span
                  className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                  style={{
                    transform: editorSettings.auto_save ? 'translateX(1.5rem)' : 'translateX(0.25rem)'
                  }}
                />
              </button>
            </div>

            {/* Minimap */}
            <div className="flex items-center justify-between">
              <label htmlFor="minimap-toggle" className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Show Minimap</label>
              <button
                id="minimap-toggle"
                onClick={() =>
                  setEditorSettings({ ...editorSettings, minimap: !editorSettings.minimap })
                }
                role="switch"
                aria-checked={editorSettings.minimap}
                aria-label="Toggle minimap display"
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                style={{
                  backgroundColor: editorSettings.minimap ? 'var(--accent-indigo)' : 'var(--border-hair)'
                }}
              >
                <span
                  className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                  style={{
                    transform: editorSettings.minimap ? 'translateX(1.5rem)' : 'translateX(0.25rem)'
                  }}
                />
              </button>
            </div>

            {/* Execution Mode */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Execution Mode
              </label>
              <select
                value={editorSettings.execution_mode || 'http'}
                onChange={(e) =>
                  setEditorSettings({ ...editorSettings, execution_mode: e.target.value as 'http' | 'websocket' })
                }
                className="w-full px-3 py-2 rounded-lg focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-void)',
                  border: '1px solid var(--border-hair)',
                  color: 'var(--text-primary)'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent-indigo)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-hair)'}
              >
                <option value="http">HTTP (Recommended)</option>
                <option value="websocket">WebSocket (Real-time)</option>
              </select>
              <p className="text-xs mt-1" style={{ color: 'var(--text-whisper)' }}>
                HTTP is more stable. WebSocket provides real-time streaming but may have connection issues.
              </p>
            </div>
          </div>
        </div>

        {/* Theme Settings */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Theme Settings</h3>
          <div className="space-y-4">
            {/* Theme */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Theme</label>
              <select
                value={themeSettings.theme}
                onChange={(e) => setThemeSettings({ ...themeSettings, theme: e.target.value })}
                className="w-full px-3 py-2 rounded-lg focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-void)',
                  border: '1px solid var(--border-hair)',
                  color: 'var(--text-primary)'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent-indigo)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-hair)'}
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </div>

            {/* Color Scheme */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Editor Color Scheme
              </label>
              <select
                value={themeSettings.color_scheme}
                onChange={(e) =>
                  setThemeSettings({ ...themeSettings, color_scheme: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-void)',
                  border: '1px solid var(--border-hair)',
                  color: 'var(--text-primary)'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent-indigo)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-hair)'}
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
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{
              color: 'var(--text-primary)',
              backgroundColor: 'var(--bg-void)',
              border: '1px solid var(--border-hair)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--border-hair)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-void)'}
            aria-label="Reset all settings to default values"
          >
            Reset to Default
          </button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{
              color: 'var(--text-primary)',
              backgroundColor: 'var(--bg-void)',
              border: '1px solid var(--border-hair)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--border-hair)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-void)'}
            aria-label="Cancel and close settings"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{
              backgroundColor: 'var(--accent-indigo)',
              color: '#ffffff'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3d4daa'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-indigo)'}
            aria-label="Save settings and close"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
