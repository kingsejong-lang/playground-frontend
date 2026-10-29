import { isPristineWorkspace, starterFileName } from '../workspace';

describe('isPristineWorkspace', () => {
  const starter = '출력("안녕")\n';
  it('is true for one untouched starter file or an empty file', () => {
    expect(isPristineWorkspace([{ name: 'main.ksj', content: starter }], starter)).toBe(true);
    expect(isPristineWorkspace([{ name: 'main.ksj', content: '  \n' }], starter)).toBe(true);
  });
  it('is false once the user wrote code or added files', () => {
    expect(isPristineWorkspace([{ name: 'main.ksj', content: '출력(1)' }], starter)).toBe(false);
    expect(isPristineWorkspace([{ name: 'main.ksj', content: starter }, { name: 'b.ksj', content: '' }], starter)).toBe(false);
  });
});

describe('starterFileName', () => {
  it("uses the language's default entry file, else main plus the first extension", () => {
    expect(starterFileName({ defaultEntryFile: 'main.py', fileExtensions: ['.py'] })).toBe('main.py');
    expect(starterFileName({ defaultEntryFile: '', fileExtensions: ['.go'] })).toBe('main.go');
    expect(starterFileName(undefined)).toBe('main.ksj');
  });
});
