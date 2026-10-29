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
    await act(() => result.current.createShare([{ name: 'main.ksj', content: '출력(1)' }], {}, 'kingsejong', languages));
    expect(result.current.shareId).toBe('AbCdEfGh1234');
    expect(result.current.shareUrl).toMatch(/\?share=AbCdEfGh1234$/);
    const req = (createShare.mock.calls[0] as unknown[])[0] as { files: { files: { path: string }[] }; title: string };
    expect(req.files.files[0].path).toBe('main.ksj');
    expect(req.title).toBe('KingSejong Code');
  });

  it('shares every file and the entry file', async () => {
    const { result, createShare } = setup();
    await act(() =>
      result.current.createShare(
        [
          { name: 'main.ksj', content: 'A' },
          { name: 'util.ksj', content: 'B' },
        ],
        { preferred: 'util.ksj' },
        'kingsejong',
        languages
      )
    );
    const req = (createShare.mock.calls[0] as unknown[])[0] as { files: { files: { path: string }[] }; entryFile: string };
    expect(req.files.files.map((f) => f.path)).toEqual(['main.ksj', 'util.ksj']);
    expect(req.entryFile).toBe('util.ksj');
  });

  it('loads all files of a share with its entry file', async () => {
    const { result } = setup();
    const onLoad = vi.fn();
    await act(() => result.current.loadShared('AbCdEfGh1234', onLoad));
    expect(onLoad).toHaveBeenCalledWith('kingsejong', [
      { name: 'a.ksj', content: 'A' },
      { name: 'b.ksj', content: 'B' },
    ], 'b.ksj');
  });

  it('rejects a malformed share id without a request', async () => {
    const { result, getShare } = setup();
    await act(() => result.current.loadShared('../x', vi.fn()));
    expect(getShare).not.toHaveBeenCalled();
    expect(result.current.error).toMatch(/invalid/i);
  });
});

describe('useShare failures', () => {
  it('refuses empty code and unknown languages without a request', async () => {
    const { result, createShare } = setup();
    await act(() => result.current.createShare([{ name: 'main.ksj', content: '  \n' }], {}, 'kingsejong', languages));
    expect(result.current.error).toBe('Please write some code first');
    await act(() => result.current.createShare([{ name: 'main.ksj', content: 'x' }], {}, 'cobol', languages));
    expect(result.current.error).toBe('Language not found');
    expect(createShare).not.toHaveBeenCalled();
  });

  it('reports a share the server did not create', async () => {
    const { result, createShare } = setup();
    createShare.mockReturnValueOnce({ share: undefined, deleteToken: '' } as never);
    await act(() => result.current.createShare([{ name: 'main.ksj', content: 'x' }], {}, 'kingsejong', languages));
    expect(result.current.shareUrl).toBeNull();
    expect(result.current.sharing).toBe(false);
    expect(result.current.error).toEqual(expect.any(String));
  });

  it('still shows the link when the clipboard is blocked, and copies again on request', async () => {
    const { result } = setup();
    const writeText = vi.fn().mockRejectedValueOnce(new Error('denied')).mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    await act(() => result.current.createShare([{ name: 'main.ksj', content: 'x' }], {}, 'kingsejong', languages));
    expect(result.current.shareUrl).toMatch(/share=AbCdEfGh1234/);
    await act(() => result.current.copyToClipboard());
    expect(writeText).toHaveBeenLastCalledWith(result.current.shareUrl);
    writeText.mockRejectedValueOnce(new Error('denied'));
    await act(() => result.current.copyToClipboard());
    act(() => result.current.closeShareModal());
    expect(result.current.shareUrl).toBeNull();
    expect(result.current.shareId).toBeNull();
  });

  it('explains a share that cannot be loaded', async () => {
    const { result, getShare } = setup();
    getShare.mockReturnValueOnce({ share: undefined } as never);
    const onLoad = vi.fn();
    await act(() => result.current.loadShared('AbCdEfGh1234', onLoad));
    expect(onLoad).not.toHaveBeenCalled();
    expect(result.current.error).toBe('Could not load the shared code. Not found');
  });
});
