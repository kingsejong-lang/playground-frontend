/**
 * Local drafts: the editor workspace saved in localStorage, one draft per language.
 * Nothing leaves the browser. Values read back are untrusted and validated.
 *
 * Usage:
 *   saveDraft('kingsejong', { files, entry: 'main.ksj', active: 'util.ksj' });
 *   const draft = loadDraft('kingsejong'); // null when absent or invalid
 */
import { z } from '@/lib/zod';

export const DRAFT_KEY_PREFIX = 'kingsejong-draft:';

const DraftSchema = z.object({
  files: z.array(z.object({ name: z.string().min(1), content: z.string() })).min(1).max(16),
  entry: z.string().optional(),
  active: z.string().optional(),
  savedAt: z.string(),
});

export type Draft = z.infer<typeof DraftSchema>;
export type DraftContent = Omit<Draft, 'savedAt'>;

/** Keeps `entry`/`active` only when they name one of the files. */
function normalize(draft: Draft): Draft {
  const names = new Set(draft.files.map((f) => f.name));
  return {
    ...draft,
    entry: draft.entry && names.has(draft.entry) ? draft.entry : undefined,
    active: draft.active && names.has(draft.active) ? draft.active : undefined,
  };
}

export function loadDraft(languageId: string): Draft | null {
  if (typeof window === 'undefined' || !languageId) return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY_PREFIX + languageId);
    if (!raw) return null;
    const parsed = DraftSchema.safeParse(JSON.parse(raw));
    return parsed.success ? normalize(parsed.data) : null;
  } catch {
    return null;
  }
}

/** Saves and returns the stored draft, or null when storage is unavailable or full. */
export function saveDraft(languageId: string, content: DraftContent): Draft | null {
  if (typeof window === 'undefined' || !languageId) return null;
  const draft = normalize({ ...content, savedAt: new Date().toISOString() });
  try {
    localStorage.setItem(DRAFT_KEY_PREFIX + languageId, JSON.stringify(draft));
    return draft;
  } catch {
    return null;
  }
}
