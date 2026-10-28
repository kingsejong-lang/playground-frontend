'use client';

import { useState, useId } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Star, Trash2 } from 'lucide-react';
import { useSnippets } from '@/features/editor/useSnippets';
import type { SnippetFilter } from '@/features/editor/snippet-types';
import { Dialog } from '@/components/ui/Dialog';
import { Button, IconButton } from '@/components/ui/Button';

interface SnippetLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSnippet: (code: string) => void;
  currentLanguage: string;
}

const FIELD = 'w-full rounded-md border border-strong bg-void px-3 text-sm text-fg placeholder:text-fg-muted';

export default function SnippetLibrary({ isOpen, onClose, onSelectSnippet, currentLanguage }: SnippetLibraryProps) {
  const t = useTranslations('snippets');
  const tc = useTranslations('common');
  const ids = { title: useId(), description: useId(), code: useId(), tags: useId() };
  const { filteredSnippets, filter, searchQuery, setFilter, setSearchQuery, addSnippet, deleteSnippet, toggleFavorite } = useSnippets();

  const [showAddForm, setShowAddForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [newSnippet, setNewSnippet] = useState({ title: '', description: '', code: '', tags: '' });

  const handleAddSnippet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSnippet.title || !newSnippet.code) return;
    try {
      addSnippet({
        title: newSnippet.title,
        description: newSnippet.description,
        code: newSnippet.code,
        language: currentLanguage,
        tags: newSnippet.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        isFavorite: false,
      });
      setNewSnippet({ title: '', description: '', code: '', tags: '' });
      setShowAddForm(false);
      setFormError(null);
    } catch (error) {
      setFormError(error instanceof Error ? `${t('saveFailed')}: ${error.message}` : t('saveFailed'));
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} title={t('title')} size="xl">
      <div className="mb-4 flex flex-wrap gap-2" role="search">
        <input
          type="search"
          placeholder={t('searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`${FIELD} h-9 min-w-48 flex-1`}
          aria-label={t('search')}
        />
        <select value={filter} onChange={(e) => setFilter(e.target.value as SnippetFilter)} className={`${FIELD} h-9 w-auto`} aria-label={t('filter')}>
          <option value="all">{t('filterAll')}</option>
          <option value="favorites">{t('filterFavorites')}</option>
          <option value="recent">{t('filterRecent')}</option>
        </select>
        <Button variant={showAddForm ? 'secondary' : 'primary'} icon={showAddForm ? undefined : <Plus />} onClick={() => setShowAddForm(!showAddForm)} aria-expanded={showAddForm}>
          {showAddForm ? tc('cancel') : t('add')}
        </Button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddSnippet} className="mb-5 space-y-3 rounded-lg border border-hair bg-surface p-4" aria-label={t('formTitle')}>
          <div>
            <label htmlFor={ids.title} className="mb-1 block text-sm text-fg-secondary">
              {t('fieldTitle')} <span className="text-fg-muted">({t('required')})</span>
            </label>
            <input id={ids.title} type="text" value={newSnippet.title} onChange={(e) => setNewSnippet({ ...newSnippet, title: e.target.value })} className={`${FIELD} h-9`} required />
          </div>
          <div>
            <label htmlFor={ids.description} className="mb-1 block text-sm text-fg-secondary">
              {t('fieldDescription')}
            </label>
            <textarea id={ids.description} value={newSnippet.description} onChange={(e) => setNewSnippet({ ...newSnippet, description: e.target.value })} className={`${FIELD} h-16 py-2`} />
          </div>
          <div>
            <label htmlFor={ids.code} className="mb-1 block text-sm text-fg-secondary">
              {t('fieldCode')} <span className="text-fg-muted">({t('required')})</span>
            </label>
            <textarea id={ids.code} value={newSnippet.code} onChange={(e) => setNewSnippet({ ...newSnippet, code: e.target.value })} className={`${FIELD} h-32 py-2 font-mono`} required />
          </div>
          <div>
            <label htmlFor={ids.tags} className="mb-1 block text-sm text-fg-secondary">
              {t('fieldTags')}
            </label>
            <input id={ids.tags} type="text" value={newSnippet.tags} onChange={(e) => setNewSnippet({ ...newSnippet, tags: e.target.value })} className={`${FIELD} h-9`} />
          </div>
          {formError && (
            <p className="rounded-md bg-err-soft px-3 py-2 text-sm text-err" role="alert">
              {formError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAddForm(false)}>
              {tc('cancel')}
            </Button>
            <Button type="submit" variant="primary" disabled={!newSnippet.title || !newSnippet.code}>
              {tc('save')}
            </Button>
          </div>
        </form>
      )}

      {filteredSnippets.length === 0 ? (
        <p className="py-10 text-center text-sm text-fg-muted" role="status">
          {t('empty')}
        </p>
      ) : (
        <ul className="space-y-3">
          {filteredSnippets.map((snippet) => (
            <li key={snippet.id} className="rounded-lg border border-hair bg-surface p-4">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-[15px] font-medium text-fg">{snippet.title}</h3>
                  {snippet.description && <p className="mt-0.5 text-sm text-fg-muted">{snippet.description}</p>}
                </div>
                <div className="flex shrink-0">
                  <IconButton
                    label={snippet.isFavorite ? t('unfavorite', { title: snippet.title }) : t('favorite', { title: snippet.title })}
                    icon={<Star className={snippet.isFavorite ? 'fill-current' : ''} />}
                    size="sm"
                    aria-pressed={snippet.isFavorite}
                    onClick={() => toggleFavorite(snippet.id)}
                    className={snippet.isFavorite ? 'text-warn' : ''}
                  />
                  <IconButton label={t('deleteLabel', { title: snippet.title })} icon={<Trash2 />} size="sm" onClick={() => deleteSnippet(snippet.id)} className="hover:text-err" />
                </div>
              </div>
              <pre className="mb-3 max-h-40 overflow-auto rounded-md bg-void p-3 font-mono text-[13px] text-fg-secondary">
                <code>{snippet.code}</code>
              </pre>
              <div className="flex items-center justify-between gap-3">
                <ul className="flex flex-wrap gap-1.5" aria-label={t('fieldTags')}>
                  {snippet.tags.map((tag) => (
                    <li key={tag} className="rounded-sm bg-accent-soft px-2 py-0.5 text-xs text-accent-text">
                      {tag}
                    </li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    onSelectSnippet(snippet.code);
                    onClose();
                  }}
                  aria-label={t('useLabel', { title: snippet.title })}
                >
                  {t('use')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
