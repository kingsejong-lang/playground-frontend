'use client';

import { useEffect, useState, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { CheckCircle2, Download, Trash2, Upload, XCircle } from 'lucide-react';
import { useHistory } from '@/features/execution/useHistory';
import { HistoryItem } from '@/features/execution/history';
import { useToast } from '@/hooks/useToast';
import type { Language } from '@kingsejong-lang/playground-proto';
import { formatRelativeTime } from '@/lib/utils/time';
import { truncateCode } from '@/lib/utils/string';
import { getLanguageName } from '@/lib/utils/language';
import { Dialog } from '@/components/ui/Dialog';
import { Button, IconButton } from '@/components/ui/Button';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadHistory: (item: HistoryItem) => void;
  languages: Language[];
}

const FIELD = 'h-9 w-full rounded-md border border-strong bg-void px-3 text-sm text-fg placeholder:text-fg-muted';

export default function HistorySidebar({ isOpen, onClose, onLoadHistory, languages }: HistorySidebarProps) {
  const t = useTranslations('history');
  const tc = useTranslations('common');
  const locale = useLocale();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    items,
    filteredItems,
    stats,
    searchQuery,
    selectedLanguage,
    selectedStatus,
    setSearchQuery,
    setSelectedLanguage,
    setSelectedStatus,
    deleteItem,
    clearAll,
    exportToJson,
    importFromJson,
    refresh,
  } = useHistory();

  // The page records runs through its own useHistory instance; re-read storage on open.
  useEffect(() => {
    if (isOpen) refresh();
  }, [isOpen, refresh]);

  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        importFromJson(e.target?.result as string);
        toast.success(t('imported'));
      } catch {
        toast.error(t('importFailed'));
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <>
      <Dialog open={isOpen && !showConfirmClear} onClose={onClose} title={t('title')} placement="side">
        <div className="space-y-3">
          <dl className="grid grid-cols-3 gap-2 text-center">
            <Stat label={t('total')} value={stats.total} />
            <Stat label={t('success')} value={stats.successful} tone="text-ok" />
            <Stat label={t('failed')} value={stats.failed} tone="text-err" />
          </dl>

          <input
            type="search"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={FIELD}
            aria-label={t('search')}
          />
          <div className="grid grid-cols-2 gap-2">
            <select value={selectedLanguage} onChange={(e) => setSelectedLanguage(e.target.value)} className={FIELD} aria-label={t('filterLanguage')}>
              <option value="">{t('allLanguages')}</option>
              {languages.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.displayName}
                </option>
              ))}
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as 'all' | 'success' | 'failed')}
              className={FIELD}
              aria-label={t('filterStatus')}
            >
              <option value="all">{t('allStatus')}</option>
              <option value="success">{t('successOnly')}</option>
              <option value="failed">{t('failedOnly')}</option>
            </select>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              icon={<Download />}
              onClick={() => {
                exportToJson();
                toast.success(t('exported'));
              }}
              disabled={stats.total === 0}
              className="flex-1"
            >
              {t('export')}
            </Button>
            <Button size="sm" variant="secondary" icon={<Upload />} onClick={() => fileInputRef.current?.click()} className="flex-1">
              {t('import')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={<Trash2 />}
              onClick={() => setShowConfirmClear(true)}
              disabled={stats.total === 0}
              className="flex-1 text-err hover:text-err"
            >
              {t('clearAll')}
            </Button>
          </div>
          <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={handleImport} className="hidden" aria-label={t('importLabel')} />
        </div>

        <div className="mt-4 border-t border-hair pt-4">
          {filteredItems.length === 0 ? (
            <p className="py-8 text-center text-sm text-fg-muted">{items.length === 0 ? t('empty') : t('noMatches')}</p>
          ) : (
            <ul className="space-y-2">
              {filteredItems.map((item) => (
                <li key={item.id} className="group relative rounded-lg border border-hair bg-surface transition-colors hover:border-strong">
                  <button
                    type="button"
                    onClick={() => {
                      onLoadHistory(item);
                      onClose();
                    }}
                    className="block w-full rounded-lg p-3 pr-11 text-left"
                    aria-label={`${t('load')}: ${getLanguageName(item.language, languages)}, ${item.success ? t('succeeded') : t('notSucceeded')}, ${truncateCode(item.code)}`}
                  >
                    <span className="flex items-center gap-2">
                      {item.success ? (
                        <CheckCircle2 className="size-4 text-ok" aria-hidden="true" />
                      ) : (
                        <XCircle className="size-4 text-err" aria-hidden="true" />
                      )}
                      <span className="text-sm font-medium text-fg">{getLanguageName(item.language, languages)}</span>
                    </span>
                    <span className="mt-1.5 block truncate font-mono text-xs text-fg-secondary">{truncateCode(item.code)}</span>
                    <span className="mt-1.5 flex items-center justify-between text-xs text-fg-muted">
                      <span>{formatRelativeTime(item.timestamp, locale)}</span>
                      <span className="tabular-nums">{item.output.metrics ? `${item.output.metrics.wallTimeMs}ms` : ''}</span>
                    </span>
                  </button>
                  <IconButton
                    label={t('deleteItem')}
                    icon={<Trash2 />}
                    size="sm"
                    onClick={() => {
                      deleteItem(item.id);
                      toast.success(t('deleted'));
                    }}
                    className="absolute right-1.5 top-1.5 opacity-0 hover:text-err group-hover:opacity-100 focus-visible:opacity-100 max-md:opacity-100"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </Dialog>

      <Dialog
        open={showConfirmClear}
        onClose={() => setShowConfirmClear(false)}
        title={t('confirmTitle')}
        description={t('confirmBody', { count: stats.total })}
        size="sm"
        alert
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowConfirmClear(false)}>
              {tc('cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                clearAll();
                setShowConfirmClear(false);
                toast.success(t('cleared'));
              }}
            >
              {t('clearAll')}
            </Button>
          </>
        }
      />
    </>
  );
}

function Stat({ label, value, tone = 'text-fg' }: { label: string; value: number; tone?: string }) {
  return (
    <div className="flex flex-col-reverse rounded-md border border-hair bg-surface px-2 py-2">
      <dt className="text-xs text-fg-muted">{label}</dt>
      <dd className={`text-xl font-semibold tabular-nums ${tone}`}>{value}</dd>
    </div>
  );
}
