'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronRight, LoaderCircle } from 'lucide-react';
import type { Template } from '@kingsejong-lang/playground-proto';
import { useRpc } from '@/lib/rpc';
import { useFailureText } from '@/hooks/useFailureText';
import { Dialog } from '@/components/ui/Dialog';
import { firstFileContent } from './templates';

interface TemplateGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLanguage: string;
  onSelectTemplate: (code: string) => void;
}

export function TemplateGallery({ isOpen, onClose, selectedLanguage, onSelectTemplate }: TemplateGalleryProps) {
  const api = useRpc();
  const t = useTranslations('templates');
  const tErr = useTranslations('errors');
  const failureText = useFailureText();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [listing, setListing] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The catalogue comes from the server (ListTemplates returns titles only).
  useEffect(() => {
    if (!isOpen || !selectedLanguage) return;
    let cancelled = false;
    setListing(true);
    setError(null);
    api.language
      .listTemplates({ languageId: selectedLanguage })
      .then((res) => !cancelled && setTemplates(res.templates))
      .catch((err: unknown) => {
        if (cancelled) return;
        setTemplates([]);
        setError(`${tErr('loadTemplates')} ${failureText(err)}`);
      })
      .finally(() => !cancelled && setListing(false));
    return () => {
      cancelled = true;
    };
  }, [api, isOpen, selectedLanguage, tErr, failureText]);

  const handleSelectTemplate = async (template: Template) => {
    setLoadingId(template.id);
    setError(null);
    try {
      const res = await api.language.getTemplate({
        languageId: template.languageId || selectedLanguage,
        templateId: template.id,
      });
      onSelectTemplate(firstFileContent(res.template?.files?.files ?? [], res.template?.entryFile));
      onClose();
    } catch (err) {
      setError(`${tErr('loadTemplate')} ${failureText(err)}`);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} title={t('title')} description={t('description')} size="lg">
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
