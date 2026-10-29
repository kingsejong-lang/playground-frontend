/**
 * Helpers for multi-file payloads (templates, shares).
 */
import type { SourceFile } from '@kingsejong-lang/playground-proto';

/** Content of the entry file if named, else of the first file, else "". */
export function firstFileContent(files: readonly Pick<SourceFile, 'path' | 'content'>[], entryFile?: string): string {
  if (entryFile) {
    const entry = files.find((f) => f.path === entryFile);
    if (entry) return entry.content;
  }
  return files[0]?.content ?? '';
}
