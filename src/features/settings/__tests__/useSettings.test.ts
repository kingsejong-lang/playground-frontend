import { act, renderHook, waitFor } from '@testing-library/react';
import { Code, ConnectError } from '@connectrpc/connect';
import { SettingsService, Theme } from '@kingsejong-lang/playground-proto';
import { rpcWrapper } from '@/test/rpc';
import { DEFAULT_EDITOR_SETTINGS, DEFAULT_THEME_SETTINGS, useSettings } from '../useSettings';

const saved = { fontSize: 16, fontFamily: 'Monaco, monospace', tabSize: 4, autoSave: true, minimap: false, theme: Theme.LIGHT };

function setup(isAuthenticated: boolean, impl: Partial<Record<'getSettings' | 'updateSettings', (...a: never[]) => unknown>> = {}) {
  const getSettings = vi.fn(impl.getSettings ?? (() => ({ settings: saved })));
  const updateSettings = vi.fn(impl.updateSettings ?? ((req: { settings: unknown }) => ({ settings: req.settings })));
  const { wrapper } = rpcWrapper(({ service }) => service(SettingsService, { getSettings, updateSettings } as never));
  return { ...renderHook(({ auth }) => useSettings(auth), { wrapper, initialProps: { auth: isAuthenticated } }), getSettings, updateSettings };
}

describe('useSettings', () => {
  it('starts with defaults and does not call the server when anonymous', async () => {
    const { result, getSettings } = setup(false);
    expect(result.current.editorSettings).toEqual(DEFAULT_EDITOR_SETTINGS);
    expect(result.current.themeSettings).toEqual(DEFAULT_THEME_SETTINGS);
    await act(async () => {});
    expect(getSettings).not.toHaveBeenCalled();
  });

  it('loads settings when authenticated', async () => {
    const { result } = setup(true);
    await waitFor(() => expect(result.current.editorSettings.font_size).toBe(16));
    expect(result.current.editorSettings).toEqual({ font_size: 16, font_family: 'Monaco, monospace', tab_size: 4, auto_save: true, minimap: false });
    expect(result.current.themeSettings.theme).toBe('light');
  });

  it('falls back to defaults when loading fails', async () => {
    const { result, getSettings } = setup(true, {
      getSettings: () => {
        throw new ConnectError('nope', Code.Unauthenticated);
      },
    });
    await waitFor(() => expect(getSettings).toHaveBeenCalled());
    expect(result.current.editorSettings).toEqual(DEFAULT_EDITOR_SETTINGS);
    expect(result.current.error).toBeNull();
  });

  it('saves locally only when anonymous', async () => {
    const { result, updateSettings } = setup(false);
    const editor = { ...DEFAULT_EDITOR_SETTINGS, font_size: 20 };
    await act(() => result.current.saveSettings(editor, DEFAULT_THEME_SETTINGS));
    expect(result.current.editorSettings.font_size).toBe(20);
    expect(updateSettings).not.toHaveBeenCalled();
  });

  it('saves with UpdateSettings and a field mask when authenticated', async () => {
    const { result, updateSettings } = setup(true);
    await waitFor(() => expect(result.current.editorSettings.font_size).toBe(16));
    await act(() => result.current.saveSettings({ ...DEFAULT_EDITOR_SETTINGS, font_size: 18 }, { theme: 'dark', color_scheme: 'vs-dark' }));
    const req = updateSettings.mock.calls[0][0] as { settings: { fontSize: number; theme: Theme }; updateMask: { paths: string[] } };
    expect(req.settings.fontSize).toBe(18);
    expect(req.settings.theme).toBe(Theme.DARK);
    expect(req.updateMask.paths).toContain('font_size');
    expect(req.updateMask.paths).not.toContain('locale');
  });

  it('rejects out-of-range values before sending', async () => {
    const { result, updateSettings } = setup(true);
    await waitFor(() => expect(result.current.editorSettings.font_size).toBe(16));
    await act(() => result.current.saveSettings({ ...DEFAULT_EDITOR_SETTINGS, font_size: 99 }, DEFAULT_THEME_SETTINGS));
    expect(updateSettings).not.toHaveBeenCalled();
    expect(result.current.error).toMatch(/font_size/);
  });
});
