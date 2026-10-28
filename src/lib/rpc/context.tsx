'use client';

/**
 * Provides the API clients to hooks. Without a provider, hooks use a lazily
 * created browser singleton; tests wrap components in <RpcProvider> with a
 * createRouterTransport() fake.
 */
import { createContext, useContext, type ReactNode } from 'react';
import type { Transport } from '@connectrpc/connect';
import { createApiClients, type ApiClients } from './clients';
import { createApiTransport } from './transport';

let defaultClients: ApiClients | undefined;

/** Defers loading a transport module until the first call. */
function lazyTransport(load: () => Promise<Transport>): Transport {
  let pending: Promise<Transport> | undefined;
  const get = () => (pending ??= load());
  return {
    unary: async (...args) => (await get()).unary(...args),
    stream: async (...args) => (await get()).stream(...args),
  };
}

/**
 * The fake backend (./fake.ts) is for local UI work only. Both env values are
 * inlined by Next.js at build time: in `next build` NODE_ENV is "production",
 * the condition folds to false and the dynamic import is removed from the bundle.
 */
function createDefaultTransport(): Transport {
  if (process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_RPC_FAKE === '1') {
    return lazyTransport(() => import('./fake').then((m) => m.createFakeTransport()));
  }
  return createApiTransport();
}

export function getDefaultClients(): ApiClients {
  defaultClients ??= createApiClients(createDefaultTransport());
  return defaultClients;
}

const RpcContext = createContext<ApiClients | null>(null);

export function RpcProvider({ clients, children }: { clients: ApiClients; children: ReactNode }) {
  return <RpcContext.Provider value={clients}>{children}</RpcContext.Provider>;
}

export function useRpc(): ApiClients {
  return useContext(RpcContext) ?? getDefaultClients();
}
