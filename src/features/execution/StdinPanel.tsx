'use client';

/**
 * Program input (stdin) for the next run, collapsed by default under the editor.
 * Shown for languages that declare CAPABILITY_STDIN.
 *
 * Usage:
 *   <StdinPanel value={stdin} onChange={setStdin} open={open} onToggle={() => setOpen((v) => !v)} />
 */
import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, TextCursorInput } from 'lucide-react';

/** RunRequest.stdin limit (bytes). */
export const MAX_STDIN_BYTES = 65536;

interface StdinPanelProps {
  value: string;
  onChange: (value: string) => void;
  open: boolean;
  onToggle: () => void;
}

export function StdinPanel({ value, onChange, open, onToggle }: StdinPanelProps) {
  const t = useTranslations('stdin');
  const id = useId();
  const hintId = useId();
  const bytes = new TextEncoder().encode(value).length;
  const over = bytes > MAX_STDIN_BYTES;

  return (
    <div className="shrink-0 border-t border-hair bg-surface">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={id}
        className="flex h-9 w-full items-center gap-2 px-3 text-left text-[13px] text-fg-secondary hover:bg-hover hover:text-fg"
      >
        <TextCursorInput className="size-4 shrink-0 text-fg-muted" aria-hidden="true" />
        <span className="font-medium">{t('title')}</span>
        {!open && value && <span className="truncate text-xs text-fg-muted">{t('lines', { count: value.split('\n').filter(Boolean).length })}</span>}
        <ChevronDown className={`ml-auto size-4 shrink-0 text-fg-muted transition-transform ${open ? '' : '-rotate-90'}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="px-3 pb-3">
          <label htmlFor={id} className="sr-only">
            {t('label')}
          </label>
          <textarea
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            spellCheck={false}
            placeholder={t('placeholder')}
            aria-describedby={hintId}
            aria-invalid={over || undefined}
            className="block w-full resize-y rounded-md border border-strong bg-void px-3 py-2 font-mono text-[13px] leading-5 text-fg placeholder:text-fg-muted"
          />
          <p id={hintId} className={`mt-1 text-xs ${over ? 'text-err' : 'text-fg-muted'}`}>
            {over ? t('tooLarge') : t('hint')}
          </p>
        </div>
      )}
    </div>
  );
}
