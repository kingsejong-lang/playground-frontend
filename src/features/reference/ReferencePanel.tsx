'use client';

/**
 * KingSejong language reference beside the editor: searchable, grouped by
 * topic, with runnable examples that insert at the editor cursor.
 *
 * Non-modal on purpose: learners read it while they type. Docked to the right
 * of the workspace from lg, an overlay drawer below that (Esc or the scrim
 * closes it).
 *
 * Usage:
 *   <ReferencePanel isOpen={open} onClose={close} onInsert={insertAtCursor}
 *     canInsert={language === 'kingsejong'} onSwitchLanguage={() => change('kingsejong')} />
 */
import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { CornerDownLeft, Search, X } from 'lucide-react';
import { Button, IconButton } from '@/components/ui/Button';
import { REFERENCE, searchReference, type ReferenceEntry, type ReferenceLocale } from './entries';

interface ReferencePanelProps {
  isOpen: boolean;
  onClose: () => void;
  /** Inserts example code into the active file. */
  onInsert: (code: string) => void;
  /** False when the active language is not KingSejong: examples are then read-only. */
  canInsert: boolean;
  /** Offered with the read-only note when KingSejong is available. */
  onSwitchLanguage?: () => void;
}

export default function ReferencePanel({ isOpen, onClose, onInsert, canInsert, onSwitchLanguage }: ReferencePanelProps) {
  const t = useTranslations('reference');
  const tc = useTranslations('common');
  const locale = (useLocale() === 'en' ? 'en' : 'ko') as ReferenceLocale;
  const searchId = useId();
  const resultsId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const groups = useMemo(() => {
    const hits = searchReference(REFERENCE, deferredQuery);
    // Topics appear in the order of their best match (reference order when not searching).
    const order = [...new Set(hits.map((e) => e.category))];
    return order.map((category) => ({ category, entries: hits.filter((e) => e.category === category) }));
  }, [deferredQuery]);
  const total = groups.reduce((n, g) => n + g.entries.length, 0);

  // Focus the search box when the panel opens.
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-30 bg-scrim lg:hidden" onClick={onClose} aria-hidden="true" />
      <aside
        className="fixed inset-y-0 right-0 z-40 flex w-[min(24rem,100vw)] flex-col border-l border-hair bg-surface lg:relative lg:z-auto lg:w-80 xl:w-96"
        aria-labelledby={`${searchId}-title`}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            onClose();
          }
        }}
      >
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-hair pl-4 pr-1">
          <h2 id={`${searchId}-title`} className="text-[13px] font-semibold text-fg-secondary">
            {t('title')}
          </h2>
          <IconButton label={tc('close')} icon={<X />} size="sm" onClick={onClose} />
        </div>

        <div className="shrink-0 space-y-2 border-b border-hair p-3" role="search">
          <label htmlFor={searchId} className="sr-only">
            {t('search')}
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted" aria-hidden="true" />
            <input
              ref={inputRef}
              id={searchId}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              aria-controls={resultsId}
              autoComplete="off"
              spellCheck={false}
              className="h-9 w-full rounded-md border border-strong bg-void pl-9 pr-9 text-sm text-fg placeholder:text-fg-muted [&::-webkit-search-cancel-button]:appearance-none"
            />
            {query && (
              <IconButton
                label={t('clearSearch')}
                icon={<X />}
                size="sm"
                className="absolute right-0.5 top-1/2 size-8 -translate-y-1/2"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
              />
            )}
          </div>
          <p className="text-xs text-fg-muted" role="status" aria-live="polite">
            {t('count', { count: total })}
          </p>
          {!canInsert && (
            <div className="rounded-md bg-info-soft px-3 py-2 text-[13px] leading-5 text-fg-secondary">
              <p>{t('otherLanguage')}</p>
              {onSwitchLanguage && (
                <Button size="sm" variant="secondary" className="mt-2" onClick={onSwitchLanguage}>
                  {t('switchLanguage')}
                </Button>
              )}
            </div>
          )}
        </div>

        <div id={resultsId} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {total === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-fg-muted">
              <p className="break-keep">{t('noMatches', { query: deferredQuery.trim() })}</p>
              <Button size="sm" variant="secondary" className="mt-3" onClick={() => setQuery('')}>
                {t('clearSearch')}
              </Button>
            </div>
          ) : (
            groups.map(({ category, entries }) => (
              <section key={category} aria-labelledby={`${resultsId}-${category}`}>
                <h3
                  id={`${resultsId}-${category}`}
                  className="sticky top-0 z-10 border-b border-hair bg-surface px-4 py-2 text-xs font-semibold text-fg-muted"
                >
                  {t(`categories.${category}`)}
                </h3>
                <ul className="divide-y divide-hair">
                  {entries.map((entry) => (
                    <ReferenceItem
                      key={entry.id}
                      entry={entry}
                      locale={locale}
                      canInsert={canInsert}
                      insertLabel={t('insertLabel', { title: entry.title[locale] })}
                      insertText={t('insert')}
                      onInsert={() => onInsert(entry.example)}
                    />
                  ))}
                </ul>
              </section>
            ))
          )}
          <p className="px-4 py-4 text-xs text-fg-muted">{t('source')}</p>
        </div>
      </aside>
    </>
  );
}

function ReferenceItem({
  entry,
  locale,
  canInsert,
  insertLabel,
  insertText,
  onInsert,
}: {
  entry: ReferenceEntry;
  locale: ReferenceLocale;
  canInsert: boolean;
  insertLabel: string;
  insertText: string;
  onInsert: () => void;
}) {
  return (
    <li className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-medium text-fg">{entry.title[locale]}</h4>
          <code className="mt-0.5 block break-keep font-mono text-[13px] leading-5 text-accent-text">{entry.syntax}</code>
        </div>
        {canInsert && (
          <Button size="sm" variant="ghost" icon={<CornerDownLeft />} onClick={onInsert} aria-label={insertLabel} className="-mr-2 shrink-0">
            {insertText}
          </Button>
        )}
      </div>
      <p className="mt-1.5 break-keep text-[13px] leading-5 text-fg-secondary">{entry.summary[locale]}</p>
      <pre className="mt-2 overflow-x-auto rounded-md border border-hair bg-void px-3 py-2 font-mono text-xs leading-5 text-fg-secondary">
        <code>{entry.example.trimEnd()}</code>
      </pre>
    </li>
  );
}
