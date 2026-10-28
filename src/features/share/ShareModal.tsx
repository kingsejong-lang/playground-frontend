'use client';

import { useEffect, useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Copy } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';

interface ShareModalProps {
  shareUrl: string;
  /** Ready-to-paste iframe markup for the share. */
  embedCode: string;
  onCopy: () => void | Promise<void>;
  onCopyEmbed: () => void | Promise<void>;
  onClose: () => void;
}

/** Copy button that confirms in place for two seconds. */
function CopyButton({
  label,
  doneLabel,
  onCopy,
  primary = false,
}: {
  label: string;
  doneLabel: string;
  onCopy: () => void | Promise<void>;
  primary?: boolean;
}) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const id = setTimeout(() => setDone(false), 2000);
    return () => clearTimeout(id);
  }, [done]);
  return (
    <Button
      variant={primary ? 'primary' : 'secondary'}
      icon={done ? <Check /> : <Copy />}
      onClick={async () => {
        await onCopy();
        setDone(true);
      }}
      className="shrink-0"
      data-autofocus={primary ? '' : undefined}
    >
      <span aria-live="polite">{done ? doneLabel : label}</span>
    </Button>
  );
}

/**
 * Share result: the link (already copied when the clipboard allowed it) and the embed code.
 */
export function ShareModal({ shareUrl, embedCode, onCopy, onCopyEmbed, onClose }: ShareModalProps) {
  const t = useTranslations('share');
  const tc = useTranslations('common');
  const urlId = useId();
  const embedId = useId();

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('title')}
      description={`${t('description')} ${t('copiedNote')}`}
      size="lg"
      footer={
        <Button variant="secondary" onClick={onClose}>
          {tc('close')}
        </Button>
      }
    >
      <div className="space-y-5">
        <div>
          <label htmlFor={urlId} className="mb-1.5 block text-sm font-medium text-fg">
            {t('urlLabel')}
          </label>
          <div className="flex gap-2 max-sm:flex-col">
            <input
              id={urlId}
              readOnly
              value={shareUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="h-9 min-w-0 flex-1 rounded-md border border-strong bg-void px-3 font-mono text-[13px] text-fg"
            />
            <CopyButton label={t('copyUrl')} doneLabel={t('urlCopied')} onCopy={onCopy} primary />
          </div>
        </div>

        <div>
          <label htmlFor={embedId} className="mb-1 block text-sm font-medium text-fg">
            {t('embedLabel')}
          </label>
          <p className="mb-1.5 text-xs text-fg-muted">{t('embedHint')}</p>
          <textarea
            id={embedId}
            readOnly
            rows={3}
            value={embedCode}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full resize-none rounded-md border border-strong bg-void px-3 py-2 font-mono text-xs leading-5 text-fg"
          />
          <div className="mt-2 flex justify-end">
            <CopyButton label={t('copyEmbed')} doneLabel={t('embedCopied')} onCopy={onCopyEmbed} />
          </div>
        </div>
      </div>
    </Dialog>
  );
}
