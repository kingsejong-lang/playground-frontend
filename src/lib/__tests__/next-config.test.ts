import { compressEnabled } from '../../../next.config';

describe('NEXT_COMPRESS', () => {
  it('keeps compression on unless explicitly set to false', () => {
    expect(compressEnabled(undefined)).toBe(true);
    expect(compressEnabled('')).toBe(true);
    expect(compressEnabled('true')).toBe(true);
    expect(compressEnabled('false')).toBe(false);
    expect(compressEnabled(' FALSE ')).toBe(false);
  });
});
