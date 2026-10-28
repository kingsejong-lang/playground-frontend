import { create } from '@bufbuild/protobuf';
import { CreateShareRequestSchema, RunRequestSchema } from '@kingsejong-lang/playground-proto';
import { RpcFailureError } from '../errors';
import { assertFilesFit, assertValid } from '../validate';

const run = (path: string, content = '출력("안녕")') =>
  create(RunRequestSchema, { languageId: 'kingsejong', files: { files: [{ path, content }] }, entryFile: path });

function failureOf(fn: () => void) {
  try {
    fn();
  } catch (e) {
    if (e instanceof RpcFailureError) return e.failure;
    throw e;
  }
  return undefined;
}

describe('assertValid', () => {
  it('accepts a normal run request', () => {
    expect(() => assertValid(RunRequestSchema, run('main.ksj'))).not.toThrow();
  });

  it.each(['../etc/passwd', 'a/../b.ksj', '/etc/passwd', 'a b.ksj'])('rejects path %s with a field path', (p) => {
    const f = failureOf(() => assertValid(RunRequestSchema, run(p)));
    expect(f?.kind).toBe('validation');
    expect(f?.field).toMatch(/files/);
  });

  it('rejects a bad language id', () => {
    const req = create(RunRequestSchema, { languageId: 'Bad-Id', files: { files: [{ path: 'm.ksj', content: '' }] } });
    expect(failureOf(() => assertValid(RunRequestSchema, req))?.field).toBe('language_id');
  });

  it('rejects an over-long share title', () => {
    const req = create(CreateShareRequestSchema, {
      languageId: 'kingsejong',
      files: { files: [{ path: 'main.ksj', content: 'x' }] },
      title: 'x'.repeat(121),
    });
    expect(failureOf(() => assertValid(CreateShareRequestSchema, req))?.kind).toBe('validation');
  });
});

describe('assertFilesFit', () => {
  it('counts UTF-8 bytes against the 256 KiB total', () => {
    const big = 'a'.repeat(64 * 1024);
    expect(() => assertFilesFit([{ content: big }, { content: big }, { content: big }, { content: big }])).not.toThrow();
    const f = failureOf(() => assertFilesFit([{ content: big }, { content: big }, { content: big }, { content: big }, { content: '가' }]));
    expect(f?.kind).toBe('payload_too_large');
  });
});
