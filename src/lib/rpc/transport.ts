/**
 * The single network transport of the app: Connect protocol, binary protobuf,
 * cookies included (session cookies are HttpOnly; JS never sees tokens).
 * connect-web sets `Connect-Protocol-Version: 1`, which together with the
 * non-simple content type forces a CORS preflight that the gateway's Origin
 * allow-list checks (no CSRF token needed).
 */
import type { Transport } from '@connectrpc/connect';
import { createConnectTransport } from '@connectrpc/connect-web';

export const DEFAULT_API_URL = 'http://localhost:8080';
/** Unary calls give up after this long; Run streams pass their own signal. */
export const DEFAULT_TIMEOUT_MS = 15_000;

export function apiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
}

export function createApiTransport(options: { baseUrl?: string; fetch?: typeof globalThis.fetch } = {}): Transport {
  const baseFetch = options.fetch ?? ((input, init) => globalThis.fetch(input, init));
  return createConnectTransport({
    baseUrl: options.baseUrl ?? apiBaseUrl(),
    useBinaryFormat: true,
    defaultTimeoutMs: DEFAULT_TIMEOUT_MS,
    fetch: (input, init) => baseFetch(input, { ...init, credentials: 'include' }),
  });
}
