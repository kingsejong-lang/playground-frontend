/**
 * Workspace helpers for switching languages.
 *
 * A workspace is "pristine" when it is a single file that still holds the
 * starter code (or nothing). Switching language then replaces it with the new
 * language's starter file instead of leaving, say, KingSejong code in main.ksj
 * under Python.
 */
import type { Language } from '@kingsejong-lang/playground-proto';
import { getMainFilename } from '@/lib/utils/language';

export function isPristineWorkspace(files: readonly { name: string; content: string }[], starterCode: string): boolean {
  if (files.length !== 1) return false;
  const content = files[0].content.trim();
  return content === '' || content === starterCode.trim();
}

/** File name a new workspace for this language starts with. */
export function starterFileName(language: Pick<Language, 'defaultEntryFile' | 'fileExtensions'> | undefined): string {
  if (!language) return 'main.ksj';
  return getMainFilename(language as Language);
}
