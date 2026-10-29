'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronRight, LoaderCircle } from 'lucide-react';
import type { Template } from '@kingsejong-lang/playground-proto';
import { useRpc } from '@/lib/rpc';
import { useFailureText } from '@/hooks/useFailureText';
import { Dialog } from '@/components/ui/Dialog';

interface TemplateGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLanguage: string;
  /** The chosen template's files (paths as names) and its entry file. */
  onSelectTemplate: (template: { files: { name: string; content: string }[]; entryFile: string }) => void;
}

export function TemplateGallery({ isOpen, onClose, selectedLanguage, onSelectTemplate }: TemplateGalleryProps) {
  const api = useRpc();
  const t = useTranslations('templates');
  const tErr = useTranslations('errors');
  const failureText = useFailureText();
  // The catalogue comes from the server (ListTemplates returns titles only). It is
  // fetched each time the dialog opens; the last list for this language stays
  // visible meanwhile, and the skeleton shows only when there is none yet.
  const [catalogue, setCatalogue] = useState<{ languageId: string; templates: Template[]; error: string | null } | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [selectError, setSelectError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !selectedLanguage) return;
    let cancelled = false;
    api.language
      .listTemplates({ languageId: selectedLanguage })
      .then((res) => ({ languageId: selectedLanguage, templates: res.templates, error: null }))
      .catch((err: unknown) => ({ languageId: selectedLanguage, templates: [], error: `${tErr('loadTemplates')} ${failureText(err)}` }))
      .then((next) => {
        if (!cancelled) setCatalogue(next);
      });
    return () => {
      cancelled = true;
    };
  }, [api, isOpen, selectedLanguage, tErr, failureText]);

  const current = catalogue?.languageId === selectedLanguage ? catalogue : null;
  const listing = !current;
  const templates = current?.templates ?? [];
  const error = selectError ?? current?.error ?? null;

  const close = () => {
    setSelectError(null);
    onClose();
  };

  const handleSelectTemplate = async (template: Template) => {
    setLoadingId(template.id);
    setSelectError(null);
    try {
      const res = await api.language.getTemplate({
        languageId: template.languageId || selectedLanguage,
        templateId: template.id,
      });
      const files = (res.template?.files?.files ?? []).map((f) => ({ name: f.path, content: f.content }));
      // The entry file named by the template, or (as before) the first file.
      const entryFile = files.find((f) => f.name === res.template?.entryFile)?.name ?? files[0]?.name ?? '';
      onSelectTemplate({ files, entryFile });
      close();
    } catch (err) {
      setSelectError(`${tErr('loadTemplate')} ${failureText(err)}`);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Dialog open={isOpen} onClose={close} title={t('title')} description={t('description')} size="lg">
      {error && (
        <p className="mb-4 rounded-md bg-err-soft px-3 py-2 text-sm text-err" role="alert">
          {error}
        </p>
      )}

      {listing ? (
        <ul className="space-y-2" aria-busy="true" aria-label={t('loading')}>
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-[4.25rem] rounded-lg border border-hair bg-hover/50" />
          ))}
        </ul>
      ) : templates.length === 0 ? (
        !error && <p className="py-10 text-center text-sm text-fg-muted">{t('empty')}</p>
      ) : (
        <ul className="space-y-2">
          {templates.map((template) => (
            <li key={template.id}>
              <button
                type="button"
                onClick={() => handleSelectTemplate(template)}
                disabled={loadingId !== null}
                aria-busy={loadingId === template.id}
                className="group flex w-full items-center gap-4 rounded-lg border border-hair bg-surface px-4 py-3 text-left transition-colors hover:border-strong hover:bg-hover disabled:cursor-wait disabled:opacity-60"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium text-fg">{template.title}</span>
                  {template.description && <span className="mt-0.5 block text-sm text-fg-muted">{template.description}</span>}
                </span>
                {loadingId === template.id ? (
                  <LoaderCircle className="size-4 shrink-0 animate-spin text-fg-muted" aria-hidden="true" />
                ) : (
                  <ChevronRight className="size-4 shrink-0 text-fg-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent-text" aria-hidden="true" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
