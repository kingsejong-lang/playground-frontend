import { buildRunFiles, resolveEntryFile } from '../entry';

describe('resolveEntryFile', () => {
  const paths = ['util.ksj', 'main.ksj', 'b.ksj'];

  it('uses the preferred entry when it is one of the files', () => {
    expect(resolveEntryFile(paths, { preferred: 'b.ksj', defaultEntryFile: 'main.ksj' })).toBe('b.ksj');
  });

  it("falls back to the language's default entry file when present", () => {
    expect(resolveEntryFile(paths, { preferred: 'gone.ksj', defaultEntryFile: 'main.ksj' })).toBe('main.ksj');
  });

  it('falls back to the first file otherwise', () => {
    expect(resolveEntryFile(paths, { defaultEntryFile: 'main.py' })).toBe('util.ksj');
    expect(resolveEntryFile(paths, {})).toBe('util.ksj');
  });

  it('returns undefined for no files', () => {
    expect(resolveEntryFile([], { preferred: 'a' })).toBeUndefined();
  });
});

describe('buildRunFiles', () => {
  it('sends every file and names an entry that is among them', () => {
    const run = buildRunFiles(
      [
        { name: 'main.ksj', content: '출력(1)' },
        { name: 'util.ksj', content: '함수 f() {}' },
      ],
      { preferred: 'util.ksj' }
    );
    expect(run.files).toEqual([
      { path: 'main.ksj', content: '출력(1)' },
      { path: 'util.ksj', content: '함수 f() {}' },
    ]);
    expect(run.entryFile).toBe('util.ksj');
    expect(run.files.some((f) => f.path === run.entryFile)).toBe(true);
  });

  it('repairs a stale entry choice instead of sending an invalid request', () => {
    const run = buildRunFiles([{ name: 'a.py', content: 'print(1)' }], { preferred: 'deleted.py', defaultEntryFile: 'main.py' });
    expect(run.entryFile).toBe('a.py');
  });
});
