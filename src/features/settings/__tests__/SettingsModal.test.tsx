import { fireEvent, render, screen } from '@testing-library/react';
import SettingsModal from '../SettingsModal';
import { DEFAULT_EDITOR_SETTINGS, DEFAULT_THEME_SETTINGS } from '../useSettings';

describe('SettingsModal', () => {
  it('keeps unsaved changes when the page re-renders with equal settings', () => {
    const onSave = vi.fn();
    const props = { isOpen: true, onClose: vi.fn(), onSave, initialEditor: DEFAULT_EDITOR_SETTINGS };
    const { rerender } = render(<SettingsModal {...props} initialTheme={{ ...DEFAULT_THEME_SETTINGS }} />);
    const minimap = screen.getByRole('switch', { name: 'Show minimap', hidden: true });
    fireEvent.click(minimap);
    expect(minimap).toHaveAttribute('aria-checked', 'false');
    // The page passes a fresh theme object on every render.
    rerender(<SettingsModal {...props} initialTheme={{ ...DEFAULT_THEME_SETTINGS }} />);
    expect(screen.getByRole('switch', { name: 'Show minimap', hidden: true })).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Save settings', hidden: true }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ minimap: false }), expect.anything());
  });

  it('picks up settings that arrive while it is open, unless the user already changed something', () => {
    const props = { isOpen: true, onClose: vi.fn(), onSave: vi.fn(), initialTheme: DEFAULT_THEME_SETTINGS };
    const { rerender } = render(<SettingsModal {...props} initialEditor={DEFAULT_EDITOR_SETTINGS} />);
    rerender(<SettingsModal {...props} initialEditor={{ ...DEFAULT_EDITOR_SETTINGS, minimap: false }} />);
    const minimap = screen.getByRole('switch', { name: 'Show minimap', hidden: true });
    expect(minimap).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(minimap);
    rerender(<SettingsModal {...props} initialEditor={{ ...DEFAULT_EDITOR_SETTINGS, minimap: false, font_size: 20 }} />);
    expect(screen.getByRole('switch', { name: 'Show minimap', hidden: true })).toHaveAttribute('aria-checked', 'true');
  });
});
