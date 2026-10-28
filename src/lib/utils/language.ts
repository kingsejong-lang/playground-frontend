/**
 * Language-related utility functions (contract type: playground.api.v1.Language).
 */

import type { Language } from '@kingsejong-lang/playground-proto';
import { DEFAULT_FILE_EXTENSION } from '../constants';

/** Find a language by its ID. */
export function resolveLanguage(languageId: string, languages: readonly Language[]): Language | null {
  return languages.find((lang) => lang.id === languageId) ?? null;
}

/** Primary file extension with a leading dot (e.g. ".py"). */
export function getLanguageExtension(language: Language): string {
  const ext = language.fileExtensions[0];
  if (!ext) return DEFAULT_FILE_EXTENSION;
  return ext.startsWith('.') ? ext : `.${ext}`;
}

/** Entry file name: the language's default entry file, else "main<ext>". */
export function getMainFilename(language: Language): string {
  return language.defaultEntryFile || `main${getLanguageExtension(language)}`;
}

/** Display name by ID, falling back to the ID itself. */
export function getLanguageName(languageId: string, languages: readonly Language[]): string {
  return resolveLanguage(languageId, languages)?.displayName || languageId;
}
