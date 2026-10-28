import { create } from '@bufbuild/protobuf';
import { act, renderHook } from '@testing-library/react';
import { LanguageSchema, ShareService } from '@kingsejong-lang/playground-proto';
import { rpcWrapper } from '@/test/rpc';
import { useShare } from '../useShare';

const languages = [create(LanguageSchema, { id: 'kingsejong', displayName: 'KingSejong', fileExtensions: ['.ksj'] })];

function setup() {
  const createShare = vi.fn(() => ({ share: { id: 'AbCdEfGh1234' }, deleteToken: 'secret' }));
  const getShare = vi.fn(() => ({
    share: { id: 'AbCdEfGh1234', languageId: 'kingsejong', entryFile: 'b.ksj', files: { files: [{ path: 'a.ksj', content: 'A' }, { path: 'b.ksj', content: 'B' }] } },
  }));
  const { wrapper } = rpcWrapper(({ service }) => service(ShareService, { createShare, getShare } as never));
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } });
  return { ...renderHook(() => useShare(), { wrapper }), createShare, getShare };
}

describe('useShare', () => {
  it('creates a share and builds the URL', async () => {
    const { result, createShare } = setup();
    await act(() => result.current.createShare('출력(1)', 'kingsejong', languages));
    expect(result.current.shareId).toBe('AbCdEfGh1234');
    expect(result.current.shareUrl).toMatch(/\?share=AbCdEfGh1234$/);
    const req = (createShare.mock.calls[0] as unknown[])[0] as { files: { files: { path: string }[] }; title: string };
    expect(req.files.files[0].path).toBe('main.ksj');
    expect(req.title).toBe('KingSejong Code');
  });

  it('loads the entry file of a share', async () => {
    const { result } = setup();
    const onLoad = vi.fn();
    await act(() => result.current.loadShared('AbCdEfGh1234', onLoad));
    expect(onLoad).toHaveBeenCalledWith('kingsejong', 'B');
  });

  it('rejects a malformed share id without a request', async () => {
    const { result, getShare } = setup();
    await act(() => result.current.loadShared('../x', vi.fn()));
    expect(getShare).not.toHaveBeenCalled();
    expect(result.current.error).toMatch(/invalid/i);
  });
});
