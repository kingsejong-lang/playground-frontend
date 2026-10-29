/**
 * Playground page (server). Loads the language list and the default starter
 * code on the server, within a short time budget and cached, so the first paint
 * does not wait for those requests in the browser. When the backend is slow or
 * down the client page fetches them itself, as before.
 */
import { loadInitialLanguages } from '@/lib/rpc/server';
import { defaultTemplateId, pickDefaultLanguage } from '@/features/editor/language-defaults';
import PlaygroundClient from './PlaygroundClient';

export default async function PlaygroundPage() {
  const initialLanguages = await loadInitialLanguages((languages) => {
    const language = pickDefaultLanguage(languages);
    return language && { languageId: language.id, templateId: defaultTemplateId(language) };
  });
  return <PlaygroundClient initialLanguages={initialLanguages} />;
}
