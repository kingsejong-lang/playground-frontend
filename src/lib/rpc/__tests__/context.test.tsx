import { renderHook } from '@testing-library/react';

describe('default RPC clients', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('is a singleton used when no provider is mounted', async () => {
    const { useRpc, getDefaultClients } = await import('../context');
    const { result } = renderHook(() => useRpc());
    expect(result.current).toBe(getDefaultClients());
  });

  it('loads the fake backend only when NEXT_PUBLIC_RPC_FAKE=1 outside production', async () => {
    vi.stubEnv('NEXT_PUBLIC_RPC_FAKE', '1');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { getDefaultClients } = await import('../context');
    const { languages } = await getDefaultClients().language.listLanguages({});
    expect(languages.map((l) => l.id)).toContain('kingsejong');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('uses the network transport in production even with the flag set', async () => {
    vi.stubEnv('NEXT_PUBLIC_RPC_FAKE', '1');
    vi.stubEnv('NODE_ENV', 'production');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    const { getDefaultClients } = await import('../context');
    await expect(getDefaultClients().language.listLanguages({})).rejects.toBeDefined();
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('LanguageService/ListLanguages'), expect.objectContaining({ credentials: 'include' }));
    fetchSpy.mockRestore();
  });
});
