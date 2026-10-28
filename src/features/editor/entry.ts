/**
 * Entry-file rules shared by the editor, share and embed.
 *
 * The entry is the file the runner executes. Order of preference:
 *   1. the user's (or share's) choice, when it is one of the files;
 *   2. the language's `defaultEntryFile`, when present among the files;
 *   3. the first file.
 * Because the result is always one of the submitted paths, the RunRequest
 * protovalidate rule "entry_file must be one of the submitted files" holds.
 *
 * Usage:
 *   const { files, entryFile } = buildRunFiles(workspace, { preferred: entryName, defaultEntryFile: lang.defaultEntryFile });
 */

export interface EntryOptions {
  preferred?: string;
  defaultEntryFile?: string;
}

export function resolveEntryFile(paths: readonly string[], { preferred, defaultEntryFile }: EntryOptions): string | undefined {
  if (preferred && paths.includes(preferred)) return preferred;
  if (defaultEntryFile && paths.includes(defaultEntryFile)) return defaultEntryFile;
  return paths[0];
}

export interface RunFiles {
  files: { path: string; content: string }[];
  entryFile: string | undefined;
}

/** All workspace files as SourceFiles plus a valid entry path. */
export function buildRunFiles(files: readonly { name: string; content: string }[], options: EntryOptions): RunFiles {
  const sources = files.map((f) => ({ path: f.name, content: f.content }));
  return { files: sources, entryFile: resolveEntryFile(sources.map((f) => f.path), options) };
}
