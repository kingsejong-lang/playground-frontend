import { sanitizeSnippetTags, sanitizeSnippetTitle, validateCodeSize } from '../sanitize';

describe('snippet sanitizers', () => {
  it('strips control characters, trims and caps titles at 200 characters', () => {
    expect(sanitizeSnippetTitle('  안녕\u0000\u0007 세종\u007f  ')).toBe('안녕 세종');
    expect(sanitizeSnippetTitle('가'.repeat(250))).toHaveLength(200);
    expect(sanitizeSnippetTitle(42 as unknown as string)).toBe('');
  });

  it('keeps at most 20 clean, non-empty tags of up to 50 characters', () => {
    const tags = ['  반복 ', '', 'a'.repeat(51), 'x\u0001y', 7 as unknown as string, ...Array.from({ length: 30 }, (_, i) => `t${i}`)];
    const clean = sanitizeSnippetTags(tags);
    expect(clean.slice(0, 2)).toEqual(['반복', 'xy']);
    expect(clean).toHaveLength(20);
    expect(sanitizeSnippetTags('nope' as unknown as string[])).toEqual([]);
  });

  it('measures code size in UTF-8 bytes', () => {
    expect(validateCodeSize('a'.repeat(1024), 1)).toBe(true);
    expect(validateCodeSize('a'.repeat(1025), 1)).toBe(false);
    // 3 bytes per Hangul syllable: 342 x 3 = 1026 bytes > 1 KiB
    expect(validateCodeSize('가'.repeat(342), 1)).toBe(false);
    expect(validateCodeSize(null as unknown as string)).toBe(false);
  });
});
