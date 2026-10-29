import { create } from '@bufbuild/protobuf';
import { Code, ConnectError } from '@connectrpc/connect';
import { act, renderHook, waitFor } from '@testing-library/react';
import { LanguageSchema, LanguageService } from '@kingsejong-lang/playground-proto';
import { rpcWrapper } from '@/test/rpc';
import { defaultCodeFor, useLanguages } from '../useLanguages';

const languages = [
  create(LanguageSchema, { id: 'python_3_12', displayName: 'Python 3.12', version: '3.12.0', fileExtensions: ['.py'] }),
  create(LanguageSchema, { id: 'go_1_22', displayName: 'Go 1.22', version: '1.22.0', fileExtensions: ['.go'] }),
];

function setup(list: () => unknown = () => ({ languages })) {
  const getTemplate = vi.fn().mockResolvedValue({
    template: { id: 'hello_world', files: { files: [{ path: 'main.py', content: 'print(1)' }] }, entryFile: 'main.py' },
  });
  const { wrapper } = rpcWrapper(({ service }) =>
    service(LanguageService, { listLanguages: list as never, getTemplate }),
  );
  return { ...renderHook(() => useLanguages(), { wrapper }), getTemplate };
}

describe('useLanguages', () => {
  it('loads languages via ListLanguages', async () => {
    const { result } = setup();
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.languages.map((l) => l.id)).toEqual(['python_3_12', 'go_1_22']);
    expect(result.current.error).toBeNull();
  });

  it('selects the first language when no KingSejong language exists', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.selectedLanguage).toBe('python_3_12');
    // Starter code comes from the default template ("hello_world" when the language names none).
    expect(result.current.code).toBe('print(1)');
  });

  it('seeds the editor from Language.defaultTemplateId', async () => {
    const withTemplate = create(LanguageSchema, { id: 'python_3_12', displayName: 'Python', defaultTemplateId: 'intro' });
    const { result, getTemplate } = setup(() => ({ languages: [withTemplate] }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getTemplate).toHaveBeenCalledWith(expect.objectContaining({ languageId: 'python_3_12', templateId: 'intro' }), expect.anything());
  });

  it('falls back to the built-in sample when the template cannot be loaded', async () => {
    const getTemplate = vi.fn().mockRejectedValue(new ConnectError('missing', Code.NotFound));
    const { wrapper } = rpcWrapper(({ service }) => service(LanguageService, { listLanguages: () => ({ languages }), getTemplate }));
    const { result } = renderHook(() => useLanguages(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.code).toBe(defaultCodeFor('python_3_12'));
  });

  it('prefers the kingsejong language', async () => {
    const ks = create(LanguageSchema, { id: 'kingsejong', displayName: 'KingSejong' });
    const { result } = setup(() => ({ languages: [...languages, ks] }));
    await waitFor(() => expect(result.current.selectedLanguage).toBe('kingsejong'));
  });

  it('shows a server-unavailable message when the backend is down', async () => {
    const { result } = setup(() => {
      throw new ConnectError('down', Code.Unavailable);
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toMatch(/reach the playground server/);
    expect(result.current.errorKind).toBe('unavailable');
    expect(result.current.languages).toEqual([]);
    // The editor still gets the built-in KingSejong sample.
    expect(result.current.code).toContain('출력');
  });

  it('changes the selected language', async () => {
    const { result, getTemplate } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.changeLanguage('go_1_22'));
    expect(result.current.selectedLanguage).toBe('go_1_22');
    // Built-in sample first, replaced by the server template once it arrives.
    await waitFor(() => expect(getTemplate).toHaveBeenLastCalledWith(expect.objectContaining({ languageId: 'go_1_22' }), expect.anything()));
  });

  it('ignores unknown language ids', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.changeLanguage('invalid_language'));
    expect(result.current.selectedLanguage).toBe('python_3_12');
  });

  it('loads the hello_world template with GetTemplate', async () => {
    const { result, getTemplate } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(() => result.current.loadTemplate());
    expect(getTemplate).toHaveBeenCalledWith(expect.objectContaining({ languageId: 'python_3_12', templateId: 'hello_world' }), expect.anything());
    expect(result.current.code).toBe('print(1)');
  });
});

describe('useLanguages with server-rendered languages', () => {
  const languages = [create(LanguageSchema, { id: 'python' }), create(LanguageSchema, { id: 'kingsejong', defaultTemplateId: 'hello_world' })];

  it('starts ready with the server data and sends no request', async () => {
    const listLanguages = vi.fn(() => ({ languages: [] }));
    const { wrapper } = rpcWrapper(({ service }) => service(LanguageService, { listLanguages } as never));
    const initial = { languages, starter: { languageId: 'kingsejong', entryFile: 'main.ksj', files: [{ path: 'main.ksj', content: '출력("서버")' }] } };
    const { result } = renderHook(() => useLanguages(initial), { wrapper });
    expect(result.current.loading).toBe(false);
    expect(result.current.selectedLanguage).toBe('kingsejong');
    expect(result.current.code).toBe('출력("서버")');
    await act(async () => {});
    expect(listLanguages).not.toHaveBeenCalled();
  });

  it('uses the built-in sample when the starter is missing', () => {
    const { wrapper } = rpcWrapper(() => {});
    const { result } = renderHook(() => useLanguages({ languages }), { wrapper });
    expect(result.current.code).toContain('출력(');
  });
});
