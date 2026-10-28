/**
 * Modal dialog on the native <dialog> element: top layer, focus containment,
 * Esc to close and focus return come from the browser.
 *
 * Usage:
 *   <Dialog open={open} onClose={close} title="설정" footer={<Button>저장</Button>}>…</Dialog>
 *   <Dialog placement="side" …> for the history sheet.
 */
'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { IconButton } from './Button';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  placement?: 'center' | 'side';
  /** Role "alertdialog" for confirmations. */
  alert?: boolean;
  className?: string;
}

const WIDTHS = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-3xl' };

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  placement = 'center',
  alert = false,
  className = '',
}: DialogProps) {
  const t = useTranslations('common');
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      // Start on the dialog's main action when it marks one (data-autofocus), not on Close.
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    }
    return () => {
      if (dialog.open && typeof dialog.close === 'function') dialog.close();
    };
  }, [open]);

  if (!open) return null;

  const frame =
    placement === 'side'
      ? 'm-0 ml-auto h-dvh max-h-dvh w-[min(26rem,100vw)] rounded-none border-l animate-slide-in'
      : `m-auto max-h-[min(85dvh,52rem)] w-[calc(100vw-2rem)] ${WIDTHS[size]} rounded-lg border animate-slide-in`;

  return (
    <dialog
      ref={ref}
      role={alert ? 'alertdialog' : undefined}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // A click on the dialog element itself is a click on the backdrop.
        if (e.target === e.currentTarget) onClose();
      }}
      className={`border-hair bg-raised p-0 text-fg shadow-raised backdrop:bg-scrim ${frame} ${className}`}
    >
      <div className="flex max-h-[inherit] flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-hair px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-fg">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-sm text-fg-muted">
                {description}
              </p>
            )}
          </div>
          <IconButton label={t('close')} icon={<X />} size="sm" onClick={() => onClose()} className="-mr-2 -mt-1" />
        </header>
        {children && <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>}
        {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-hair px-5 py-3">{footer}</footer>}
      </div>
    </dialog>
  );
}
