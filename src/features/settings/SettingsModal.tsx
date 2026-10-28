import { useState, useEffect, useId } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import {
  DEFAULT_EDITOR_SETTINGS,
  DEFAULT_THEME_SETTINGS,
  normalizeColorScheme,
  type EditorSettings,
  type ThemeSettings,
} from './useSettings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (editor: EditorSettings, theme: ThemeSettings) => void;
  initialEditor?: EditorSettings;
  initialTheme?: ThemeSettings;
  isAuthenticated?: boolean;
}

const FONT_OPTIONS: { value: string; label: string }[] = [
  { value: 'Fira Code, Monaco, monospace', label: 'Fira Code' },
  { value: 'D2Coding, monospace', label: 'D2Coding' },
  { value: 'Monaco, monospace', label: 'Monaco' },
  { value: 'Consolas, monospace', label: 'Consolas' },
  { value: "'Courier New', monospace", label: 'Courier New' },
  { value: 'monospace', label: '' },
];

const FIELD = 'h-9 w-full rounded-md border border-strong bg-void px-3 text-sm text-fg';

function Switch({ id, checked, onChange, describedBy }: { id: string; checked: boolean; onChange: (v: boolean) => void; describedBy?: string }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-describedby={describedBy}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
        checked ? 'border-accent bg-accent' : 'border-strong bg-hover'
      }`}
    >
      <span
        className={`inline-block size-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`}
        aria-hidden="true"
      />
    </button>
  );
}

export default function SettingsModal({ isOpen, onClose, onSave, initialEditor, initialTheme, isAuthenticated = false }: SettingsModalProps) {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const ids = { size: useId(), font: useId(), tab: useId(), auto: useId(), autoHint: useId(), minimap: useId(), theme: useId(), scheme: useId() };
  const [editorSettings, setEditorSettings] = useState<EditorSettings>(initialEditor || DEFAULT_EDITOR_SETTINGS);
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>(initialTheme || DEFAULT_THEME_SETTINGS);

  // Re-sync the draft each time the dialog opens.
  useEffect(() => {
    if (!isOpen) return;
    if (initialEditor) setEditorSettings(initialEditor);
    if (initialTheme) setThemeSettings({ ...initialTheme, color_scheme: normalizeColorScheme(initialTheme.color_scheme) });
  }, [isOpen, initialEditor, initialTheme]);

  const handleSave = () => {
    onSave(editorSettings, themeSettings);
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title={t('title')}
      description={isAuthenticated ? t('syncNote') : undefined}
      size="md"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => {
              setEditorSettings(DEFAULT_EDITOR_SETTINGS);
              setThemeSettings(DEFAULT_THEME_SETTINGS);
            }}
            className="mr-auto"
          >
            {t('reset')}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            {tc('cancel')}
          </Button>
          <Button variant="primary" onClick={handleSave}>
            {t('saveSettings')}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <fieldset className="space-y-4">
          <legend className="mb-3 text-sm font-semibold text-fg">{t('editor')}</legend>

          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <label htmlFor={ids.size} className="text-sm text-fg-secondary">
                {t('fontSize')}
              </label>
              <output htmlFor={ids.size} className="text-sm tabular-nums text-fg">
                {t('fontSizeValue', { size: editorSettings.font_size })}
              </output>
            </div>
            <input
              id={ids.size}
              type="range"
              min="10"
              max="24"
              value={editorSettings.font_size}
              onChange={(e) => setEditorSettings({ ...editorSettings, font_size: Number(e.target.value) })}
              className="w-full accent-[var(--accent-indigo)]"
            />
          </div>

          <div>
            <label htmlFor={ids.font} className="mb-1.5 block text-sm text-fg-secondary">
              {t('fontFamily')}
            </label>
            <select
              id={ids.font}
              value={editorSettings.font_family}
              onChange={(e) => setEditorSettings({ ...editorSettings, font_family: e.target.value })}
              className={FIELD}
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label || t('fontSystem')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <label htmlFor={ids.tab} className="text-sm text-fg-secondary">
                {t('tabSize')}
              </label>
              <output htmlFor={ids.tab} className="text-sm tabular-nums text-fg">
                {t('tabSizeValue', { size: editorSettings.tab_size })}
              </output>
            </div>
            <input
              id={ids.tab}
              type="range"
              min="2"
              max="8"
              step="2"
              value={editorSettings.tab_size}
              onChange={(e) => setEditorSettings({ ...editorSettings, tab_size: Number(e.target.value) })}
              className="w-full accent-[var(--accent-indigo)]"
            />
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <label htmlFor={ids.auto} className="text-sm text-fg-secondary">
                {t('autoSave')}
              </label>
              <p id={ids.autoHint} className="mt-0.5 text-xs text-fg-muted">
                {t('autoSaveHint')}
              </p>
            </div>
            <Switch
              id={ids.auto}
              checked={editorSettings.auto_save}
              onChange={(v) => setEditorSettings({ ...editorSettings, auto_save: v })}
              describedBy={ids.autoHint}
            />
          </div>

          <div className="flex items-center justify-between">
            <label htmlFor={ids.minimap} className="text-sm text-fg-secondary">
              {t('minimap')}
            </label>
            <Switch id={ids.minimap} checked={editorSettings.minimap} onChange={(v) => setEditorSettings({ ...editorSettings, minimap: v })} />
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-3 text-sm font-semibold text-fg">{t('appearance')}</legend>
          <div>
            <label htmlFor={ids.theme} className="mb-1.5 block text-sm text-fg-secondary">
              {t('theme')}
            </label>
            <select
              id={ids.theme}
              value={themeSettings.theme}
              onChange={(e) => setThemeSettings({ ...themeSettings, theme: e.target.value as ThemeSettings['theme'] })}
              className={FIELD}
            >
              <option value="system">{t('themeSystem')}</option>
              <option value="dark">{t('themeDark')}</option>
              <option value="light">{t('themeLight')}</option>
            </select>
          </div>
          <div>
            <label htmlFor={ids.scheme} className="mb-1.5 block text-sm text-fg-secondary">
              {t('colorScheme')}
            </label>
            <select
              id={ids.scheme}
              value={normalizeColorScheme(themeSettings.color_scheme)}
              onChange={(e) => setThemeSettings({ ...themeSettings, color_scheme: e.target.value })}
              className={FIELD}
            >
              <option value="sanctuary">{t('schemeSanctuary')}</option>
              <option value="high-contrast">{t('schemeHighContrast')}</option>
            </select>
          </div>
        </fieldset>
      </div>
    </Dialog>
  );
}
