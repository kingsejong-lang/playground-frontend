/**
 * Language data rendered on the server and handed to the client page, so the
 * first paint does not wait for ListLanguages and GetTemplate in the browser.
 *
 * The server encodes the ListLanguages response as base64 protobuf (it holds
 * 64-bit integers, which plain JSON props cannot carry); the client decodes it.
 * Safe to import from client code.
 *
 * Usage (client):
 *   const initial = decodeInitialLanguages(props.initialLanguages);
 *   const { languages } = useLanguages(initial);
 */
import { fromBinary } from '@bufbuild/protobuf';
import { ListLanguagesResponseSchema, type Language } from '@kingsejong-lang/playground-proto';

/** Serializable props from the server page. */
export interface InitialLanguagesPayload {
  /** ListLanguagesResponse, binary protobuf, base64. */
  languages: string;
  /** Default template of the starter language, when it loaded in time. */
  starter?: InitialStarter;
}

export interface InitialStarter {
  languageId: string;
  files: { path: string; content: string }[];
  entryFile: string;
}

export interface InitialLanguages {
  languages: Language[];
  starter?: InitialStarter;
}

export function encodeBase64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function decodeBase64(text: string): Uint8Array {
  const s = atob(text);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

/** Decodes the server payload; null when absent or unreadable (the client then fetches). */
export function decodeInitialLanguages(payload: InitialLanguagesPayload | null | undefined): InitialLanguages | null {
  if (!payload) return null;
  try {
    const { languages } = fromBinary(ListLanguagesResponseSchema, decodeBase64(payload.languages));
    if (languages.length === 0) return null;
    return { languages, starter: payload.starter };
  } catch {
    return null;
  }
}
