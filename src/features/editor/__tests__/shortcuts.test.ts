import { GLOBAL_SHORTCUTS } from '../shortcuts';

/** Combinations browsers or the OS reserve or users expect to keep (new tab, address bar, find, hide, history, bookmarks). */
const RESERVED = ['t', 'l', 'h', 'f', 'n', 'w', 'r', 'd', 'k', 'p', 'b', 'j', 'y', ',', '/'];

describe('global shortcuts', () => {
  it('is limited to run, stop, save draft and help', () => {
    expect(Object.keys(GLOBAL_SHORTCUTS).sort()).toEqual(['help', 'run', 'save', 'stop']);
  });

  it('never claims a browser-reserved Mod+key', () => {
    for (const s of Object.values(GLOBAL_SHORTCUTS)) {
      if (s.mod) expect(RESERVED).not.toContain(s.key.toLowerCase());
    }
  });

  it('uses Mod+. to stop and a bare ? for help', () => {
    expect(GLOBAL_SHORTCUTS.stop).toMatchObject({ key: '.', mod: true });
    expect(GLOBAL_SHORTCUTS.help).toMatchObject({ key: '?', mod: false });
    expect(GLOBAL_SHORTCUTS.save).toMatchObject({ key: 's', mod: true });
  });
});
