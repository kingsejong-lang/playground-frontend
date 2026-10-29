import { REFERENCE, REFERENCE_CATEGORIES, searchReference } from '../entries';

describe('reference entries', () => {
  it('have unique ids, known categories and text in both locales', () => {
    expect(new Set(REFERENCE.map((e) => e.id)).size).toBe(REFERENCE.length);
    for (const e of REFERENCE) {
      expect(REFERENCE_CATEGORIES).toContain(e.category);
      for (const text of [e.title.ko, e.title.en, e.summary.ko, e.summary.en, e.syntax]) expect(text.trim()).not.toBe('');
      expect(e.example.endsWith('\n')).toBe(true);
    }
    // Every category has at least one entry, so no heading renders empty.
    for (const c of REFERENCE_CATEGORIES) expect(REFERENCE.some((e) => e.category === c)).toBe(true);
  });

  it('examples use KingSejong comments and never the C-style ones', () => {
    for (const e of REFERENCE) expect(e.example).not.toMatch(/^\s*\/\//m);
  });
});

describe('searchReference', () => {
  const ids = (q: string) => searchReference(REFERENCE, q).map((e) => e.id);

  it('returns everything for an empty query', () => {
    expect(ids('  ')).toHaveLength(REFERENCE.length);
  });

  it('finds Korean keywords, English names and aliases', () => {
    expect(ids('만약')).toContain('if');
    expect(ids('while')).toEqual(expect.arrayContaining(['while']));
    expect(ids('print')).toContain('print');
    expect(ids('Filter')).toContain('filter');
  });

  it('requires every term to match', () => {
    expect(ids('range loop')).toContain('range-loop');
    expect(ids('range zzz')).toEqual([]);
  });

  it('matches decomposed Hangul input', () => {
    expect(ids('출력'.normalize('NFD'))).toContain('print');
  });
});

describe('searchReference ranking', () => {
  it('puts name matches before matches in the description', () => {
    const ids = searchReference(REFERENCE, '반복').map((e) => e.id);
    // "산술 연산" mentions 반복 (string repetition) only in its summary.
    expect(ids.indexOf('while')).toBeLessThan(ids.indexOf('arithmetic'));
    expect(ids[0]).toBe('while');
  });
});
