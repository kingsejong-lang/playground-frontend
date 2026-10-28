/**
 * Test helpers: in-memory Connect backends via createRouterTransport.
 *
 * Usage:
 *   const { wrapper } = rpcWrapper(({ service }) => service(LanguageService, { listLanguages: () => ({ languages }) }));
 *   renderHook(() => useLanguages(), { wrapper });
 */
import type { ReactNode } from 'react';
import { createRouterTransport, type ConnectRouter } from '@connectrpc/connect';
import { createApiClients, type ApiClients } from '@/lib/rpc/clients';
import { RpcProvider } from '@/lib/rpc/context';

export function fakeClients(routes: (router: ConnectRouter) => void): ApiClients {
  return createApiClients(createRouterTransport(routes));
}

export function rpcWrapper(routes: (router: ConnectRouter) => void) {
  const clients = fakeClients(routes);
  function wrapper({ children }: { children: ReactNode }) {
    return <RpcProvider clients={clients}>{children}</RpcProvider>;
  }
  return { clients, wrapper };
}
