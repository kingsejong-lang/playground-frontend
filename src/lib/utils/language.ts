/**
 * Language-related utility functions
 */

import { Language } from '../api';
import { DEFAULT_FILE_EXTENSION } from '../constants';

/**
 * Find a language by its ID
 * @param languageId - Language ID to find
 * @param languages - Array of available languages
 * @returns Language object or null if not found
 */
export function resolveLanguage(
  languageId: string,
  languages: Language[]
): Language | null {
  return languages.find((lang) => lang.id === languageId) ?? null;
}

/**
 * Get the primary file extension for a language
 * @param language - Language object
 * @returns File extension with dot (e.g., ".py")
 */
export function getLanguageExtension(language: Language): string {
  return language.extensions[0] || DEFAULT_FILE_EXTENSION;
}

/**
 * Get the main filename for a language (e.g., "main.py")
 * @param language - Language object
 * @returns Main filename string
 */
export function getMainFilename(language: Language): string {
  const extension = getLanguageExtension(language);
  return `main${extension}`;
}

/**
 * Get language name by ID, with fallback to ID itself
 * @param languageId - Language ID
 * @param languages - Array of available languages
 * @returns Language name or ID if not found
 */
export function getLanguageName(
  languageId: string,
  languages: Language[]
): string {
  const language = resolveLanguage(languageId, languages);
  return language?.name ?? languageId;
}
