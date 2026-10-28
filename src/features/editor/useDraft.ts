/**
 * Saves the workspace as a local draft: on demand (Mod+S) and, when the
 * "auto save" setting is on, one second after edits stop.
 *
 * Usage:
 *   const { saveNow, lastSavedAt } = useDraft({ languageId, files, entry, active, autoSave });
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { saveDraft, type DraftContent } from './drafts';

export const AUTO_SAVE_DELAY_MS = 1000;

export interface DraftInput extends DraftContent {
  languageId: string;
  autoSave: boolean;
}

export function useDraft({ languageId, files, entry, active, autoSave }: DraftInput) {
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const latest = useRef<DraftInput>({ languageId, files, entry, active, autoSave });
  const firstRender = useRef(true);
  const savedLanguage = useRef(languageId);

  useEffect(() => {
    latest.current = { languageId, files, entry, active, autoSave };
  });

  const saveNow = useCallback((): string | null => {
    const { languageId: id, files: f, entry: e, active: a } = latest.current;
    if (!id || f.length === 0) return null;
    const saved = saveDraft(id, { files: f, entry: e, active: a });
    if (saved) setLastSavedAt(saved.savedAt);
    return saved?.savedAt ?? null;
  }, []);

  // Debounced auto-save; the first render (initial or restored content) is not an edit.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    // A language switch is not an edit: the files on screen still belong to the previous language.
    if (savedLanguage.current !== languageId) {
      savedLanguage.current = languageId;
      return;
    }
    if (!autoSave) return;
    const id = setTimeout(saveNow, AUTO_SAVE_DELAY_MS);
    return () => clearTimeout(id);
  }, [languageId, files, entry, active, autoSave, saveNow]);

  return { saveNow, lastSavedAt };
}
