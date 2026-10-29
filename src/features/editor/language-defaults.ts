/**
 * Which language a new visitor starts with and which template seeds it.
 * Free of React so server components can use it too.
 */
import type { Language } from '@kingsejong-lang/playground-proto';

/** Template id used when a language does not name its own default template. */
export const FALLBACK_TEMPLATE_ID = 'hello_world';

/** Preferred default language ids, in order (new contract id first, then the legacy id). */
export const PREFERRED_DEFAULTS = ['kingsejong', 'kingsejong_v0_3'];

export function pickDefaultLanguage(langs: readonly Language[]): Language | undefined {
  for (const id of PREFERRED_DEFAULTS) {
    const found = langs.find((l) => l.id === id);
    if (found) return found;
  }
  return langs.find((l) => l.id.startsWith('kingsejong')) ?? langs[0];
}

/** The template that seeds a new editor for this language. */
export function defaultTemplateId(language: Pick<Language, 'defaultTemplateId'> | undefined): string {
  return language?.defaultTemplateId || FALLBACK_TEMPLATE_ID;
}
