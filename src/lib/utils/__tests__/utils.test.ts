import { formatRelativeTime } from '../time';
import { generateId, truncate, truncateCode } from '../string';
import { getLanguageExtension, getLanguageName, getMainFilename, resolveLanguage } from '../language';
import { create } from '@bufbuild/protobuf';
import { LanguageSchema } from '@kingsejong-lang/playground-proto';

describe('formatRelativeTime', () => {
  const now = new Date('2026-10-29T12:00:00Z');
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });
  afterEach(() => vi.useRealTimers());

  it('uses relative wording within a day, in the given locale', () => {
    expect(formatRelativeTime(new Date(now.getTime() - 10_000), 'en')).toBe('now');
    expect(formatRelativeTime(new Date(now.getTime() - 5 * 60_000), 'en')).toBe('5 minutes ago');
    expect(formatRelativeTime(new Date(now.getTime() - 3 * 3_600_000).toISOString(), 'ko')).toBe('3시간 전');
  });

  it('falls back to a date and time after a day', () => {
    expect(formatRelativeTime(new Date('2026-10-01T09:30:00Z'), 'en')).toMatch(/2026/);
  });
});

describe('string helpers', () => {
  it('truncates with an ellipsis only when needed', () => {
    expect(truncate('short', 10)).toBe('short');
    expect(truncate('0123456789abc', 10)).toBe('0123456789...');
  });

  it('shows the first line of code and marks more lines', () => {
    expect(truncateCode('출력(1)\n출력(2)')).toBe('출력(1)...');
    expect(truncateCode('한 줄')).toBe('한 줄');
    expect(truncateCode('x'.repeat(80), 10)).toBe('xxxxxxxxxx...');
  });

  it('generates unique prefixed ids', () => {
    const a = generateId('file');
    expect(a).toMatch(/^file-\d+-[a-z0-9]+$/);
    expect(generateId('file')).not.toBe(a);
  });
});

describe('language helpers', () => {
  const langs = [
    create(LanguageSchema, { id: 'python', displayName: 'Python', fileExtensions: ['py'] }),
    create(LanguageSchema, { id: 'go', displayName: '', fileExtensions: [], defaultEntryFile: 'main.go' }),
  ];

  it('resolves languages and names, falling back to the id', () => {
    expect(resolveLanguage('python', langs)?.displayName).toBe('Python');
    expect(resolveLanguage('rust', langs)).toBeNull();
    expect(getLanguageName('go', langs)).toBe('go');
    expect(getLanguageName('rust', langs)).toBe('rust');
  });

  it('derives the entry file name from the default entry or the first extension', () => {
    expect(getLanguageExtension(langs[0])).toBe('.py');
    expect(getMainFilename(langs[0])).toBe('main.py');
    expect(getLanguageExtension(langs[1])).toBe('.txt');
    expect(getMainFilename(langs[1])).toBe('main.go');
  });
});
