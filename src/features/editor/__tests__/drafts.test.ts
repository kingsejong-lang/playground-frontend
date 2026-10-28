import { loadDraft, saveDraft, DRAFT_KEY_PREFIX } from '../drafts';

describe('drafts', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips a draft per language', () => {
    const saved = saveDraft('kingsejong', {
      files: [
        { name: 'main.ksj', content: '출력("안녕")' },
        { name: 'util.ksj', content: '' },
      ],
      entry: 'main.ksj',
      active: 'util.ksj',
    });
    expect(saved?.savedAt).toEqual(expect.any(String));
    expect(loadDraft('kingsejong')).toMatchObject({ entry: 'main.ksj', active: 'util.ksj', files: [{ name: 'main.ksj' }, { name: 'util.ksj' }] });
    expect(loadDraft('python')).toBeNull();
  });

  it('ignores corrupt or foreign data', () => {
    localStorage.setItem(`${DRAFT_KEY_PREFIX}go`, '{"files": "nope"}');
    expect(loadDraft('go')).toBeNull();
    localStorage.setItem(`${DRAFT_KEY_PREFIX}go`, 'not json');
    expect(loadDraft('go')).toBeNull();
  });

  it('drops an entry that is not one of the files', () => {
    saveDraft('go', { files: [{ name: 'a.go', content: 'package main' }], entry: 'missing.go' });
    expect(loadDraft('go')?.entry).toBeUndefined();
  });
});
