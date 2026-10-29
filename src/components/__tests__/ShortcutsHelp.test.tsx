import { render, screen, within } from '@testing-library/react';
import { ShortcutsHelp } from '../ShortcutsHelp';
import { GLOBAL_SHORTCUTS, shortcutKeys } from '@/features/editor/shortcuts';

function setPlatform(value: string) {
  Object.defineProperty(navigator, 'platform', { value, configurable: true });
}

function keysFor(label: string) {
  const row = screen.getByText(label, { selector: 'dt' }).parentElement!;
  return within(row).getAllByText(/./, { selector: 'kbd' }).map((k) => k.textContent);
}

afterEach(() => setPlatform(''));

describe('shortcutKeys', () => {
  it('prefixes the modifier and upper-cases single keys', () => {
    expect(shortcutKeys(GLOBAL_SHORTCUTS.run, '⌘')).toEqual(['⌘', 'Enter']);
    expect(shortcutKeys(GLOBAL_SHORTCUTS.save, 'Ctrl')).toEqual(['Ctrl', 'S']);
    expect(shortcutKeys({ key: 'k', mod: true, shift: true }, 'Ctrl')).toEqual(['Ctrl', 'Shift', 'K']);
    expect(shortcutKeys(GLOBAL_SHORTCUTS.help, 'Ctrl')).toEqual(['?']);
  });
});

describe('ShortcutsHelp', () => {
  it('uses Ctrl off macOS', () => {
    setPlatform('Win32');
    render(<ShortcutsHelp isOpen onClose={vi.fn()} />);
    expect(keysFor('Run code')).toEqual(['Ctrl', 'Enter']);
    expect(keysFor('Stop the run')).toEqual(['Ctrl', '.']);
    expect(keysFor('Let Tab leave the editor (toggle)')).toEqual(['Ctrl', 'M']);
  });

  it('uses ⌘ on macOS, where Ctrl+M is taken', () => {
    setPlatform('MacIntel');
    render(<ShortcutsHelp isOpen onClose={vi.fn()} />);
    expect(keysFor('Run code')).toEqual(['⌘', 'Enter']);
    expect(screen.getAllByText('⌘', { selector: 'kbd' })[0].className).toContain('font-sans');
    expect(keysFor('Let Tab leave the editor (toggle)')).toEqual(['Ctrl', 'Shift', 'M']);
  });
});
