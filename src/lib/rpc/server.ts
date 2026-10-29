/**
 * Server-side ListLanguages (+ the default language's starter template) for the
 * playground page. Import only from server components.
 *
 * - One time budget for both calls (SERVER_BUDGET_MS); on timeout or any error
 *   the page renders without data and the browser fetches as before.
 * - Results are cached in memory: successes for CACHE_TTL_MS, failures for
 *   FAILURE_TTL_MS. Every server request shares the frontend server's IP in the
 *   gateway's rate limit, so calling per page view would exhaust that bucket.
 * - No cookies and no Origin header are sent: the gateway accepts such requests
 *   (originGuard), and nothing user-specific is fetched.
 *
 * The API base URL is PLAYGROUND_API_INTERNAL_URL when set (e.g. a container
 * network name), else NEXT_PUBLIC_API_URL, else http://localhost:8080.
 *
 * Usage (server component):
 *   const initialLanguages = await loadInitialLanguages(chooseStarter);
 *   return <PlaygroundClient initialLanguages={initialLanguages} />;
 */
import { toBinary } from '@bufbuild/protobuf';
import { createClient, type Transport } from '@connectrpc/connect';
import { createConnectTransport } from '@connectrpc/connect-web';
import { LanguageService, ListLanguagesResponseSchema, type Language } from '@kingsejong-lang/playground-proto';
import { DEFAULT_API_URL } from './transport';
import { encodeBase64, type InitialLanguagesPayload } from './initial';

/** Picks the language (and its template) whose starter code is fetched with the list. */
export type StarterChoice = (languages: readonly Language[]) => { languageId: string; templateId: string } | undefined;

export const SERVER_BUDGET_MS = 700;
export const CACHE_TTL_MS = 60_000;
export const FAILURE_TTL_MS = 15_000;

export function serverApiBaseUrl(): string {
  return process.env.PLAYGROUND_API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
}

function serverTransport(): Transport {
  return createConnectTransport({ baseUrl: serverApiBaseUrl(), useBinaryFormat: true });
}

/** Fetches languages and the starter code within `budgetMs`; throws on failure. */
export async function fetchInitialLanguages(
  transport: Transport,
  chooseStarter: StarterChoice,
  budgetMs = SERVER_BUDGET_MS
): Promise<InitialLanguagesPayload> {
  const signal = AbortSignal.timeout(budgetMs);
  const client = createClient(LanguageService, transport);
  const response = await client.listLanguages({}, { signal });
  const payload: InitialLanguagesPayload = { languages: encodeBase64(toBinary(ListLanguagesResponseSchema, response)) };
  const choice = chooseStarter(response.languages);
  if (choice) {
    try {
      const { template } = await client.getTemplate(choice, { signal });
      const files = (template?.files?.files ?? []).map((f) => ({ path: f.path, content: f.content }));
      if (files.length > 0) payload.starter = { languageId: choice.languageId, files, entryFile: template?.entryFile ?? '' };
    } catch {
      // The client falls back to its built-in sample for this language.
    }
  }
  return payload;
}

let cache: { value: InitialLanguagesPayload | null; expires: number } | null = null;
let inflight: Promise<InitialLanguagesPayload | null> | null = null;

/** Cached, never throws: null means "let the browser fetch". */
export async function loadInitialLanguages(
  chooseStarter: StarterChoice,
  options: { now?: number; transport?: Transport } = {}
): Promise<InitialLanguagesPayload | null> {
  // With the development fake backend the browser's data comes from fake.ts; the server stays out.
  if (process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_RPC_FAKE === '1') return null;
  if (cache && cache.expires > (options.now ?? Date.now())) return cache.value;
  inflight ??= fetchInitialLanguages(options.transport ?? serverTransport(), chooseStarter)
    .then((value) => {
      cache = { value, expires: Date.now() + CACHE_TTL_MS };
      return value;
    })
    .catch(() => {
      cache = { value: null, expires: Date.now() + FAILURE_TTL_MS };
      return null;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Test hook: forget cached results. */
export function resetInitialLanguagesCache(): void {
  cache = null;
  inflight = null;
}
