import { renderHook } from '@testing-library/react';
import { Code, ConnectError } from '@connectrpc/connect';
import { LanguageService } from '@kingsejong-lang/playground-proto';
import { rpcWrapper } from '@/test/rpc';
import { useFormatCode } from '../useFormatCode';

function hook(formatCode: (req: { file?: { path: string; content: string } }) => unknown) {
  const { wrapper } = rpcWrapper(({ service }) => service(LanguageService, { formatCode } as never));
  return renderHook(() => useFormatCode(), { wrapper }).result.current;
}

describe('useFormatCode', () => {
  it('returns the formatted content', async () => {
    const format = hook((req) => ({ file: { path: req.file!.path, content: req.file!.content.trim() + '\n' } }));
    await expect(format('kingsejong', 'main.ksj', '  x = 1  ')).resolves.toEqual({ ok: true, content: 'x = 1\n' });
  });

  it('reports the first diagnostic, with its line when known', async () => {
    const withLine = hook(() => ({ diagnostics: [{ line: 3, message: 'unexpected token' }] }));
    await expect(withLine('kingsejong', 'main.ksj', 'x')).resolves.toEqual({ ok: false, message: 'line 3: unexpected token' });
    const noLine = hook(() => ({ diagnostics: [{ message: 'cannot parse' }] }));
    await expect(noLine('kingsejong', 'main.ksj', 'x')).resolves.toEqual({ ok: false, message: 'cannot parse' });
  });

  it('keeps the original content when the server returns no file', async () => {
    const format = hook(() => ({}));
    await expect(format('kingsejong', 'main.ksj', 'x')).resolves.toEqual({ ok: true, content: 'x' });
  });

  it('maps transport failures and invalid requests to messages', async () => {
    const down = hook(() => {
      throw new ConnectError('down', Code.Unavailable);
    });
    const r = await down('kingsejong', 'main.ksj', 'x');
    expect(r.ok).toBe(false);
    const invalid = hook(() => ({}));
    const v = await invalid('', '', 'x');
    expect(v).toEqual({ ok: false, message: expect.any(String) });
  });
});
