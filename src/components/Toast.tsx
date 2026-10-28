/**
 * Toast notifications.
 *
 * The container is a manual popover, so toasts stay visible above modal dialogs
 * (both live in the browser's top layer; the most recently shown wins).
 * Errors are announced assertively, everything else politely.
 */
'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  action?: ToastAction;
}

const ICONS = { success: CheckCircle2, error: XCircle, warning: AlertTriangle, info: Info };
const TONES: Record<ToastType, string> = {
  success: 'text-ok',
  error: 'text-err',
  warning: 'text-warn',
  info: 'text-info',
};

export interface ToastProps extends ToastItem {
  onClose: () => void;
}

export function Toast({ type, message, duration, action, onClose }: ToastProps) {
  const t = useTranslations('toast');
  const [paused, setPaused] = useState(false);
  const expire = useEffectEvent(() => onClose());
  // Toasts with an action stay long enough to reach the button.
  const timeout = duration ?? (action ? 8000 : type === 'error' ? 7000 : 4000);

  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => expire(), timeout);
    return () => clearTimeout(timer);
  }, [paused, timeout]);

  const Icon = ICONS[type];
  return (
    <div
      className="pointer-events-auto flex w-[min(22rem,calc(100vw-2rem))] animate-slide-in items-start gap-3 rounded-lg border border-hair bg-raised p-3 pr-2 shadow-raised"
      role={type === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <Icon className={`mt-0.5 size-4 shrink-0 ${TONES[type]}`} aria-hidden="true" />
      <p className="min-w-0 flex-1 text-sm text-fg">{message}</p>
      {action && (
        <button
          type="button"
          onClick={() => {
            action.onClick();
            onClose();
          }}
          className="-my-1 shrink-0 rounded-md px-2 py-1 text-sm font-medium text-accent-text hover:bg-hover"
        >
          {action.label}
        </button>
      )}
      <button
        type="button"
        onClick={() => onClose()}
        className="-my-1 inline-flex size-7 shrink-0 items-center justify-center rounded-md text-fg-muted hover:bg-hover hover:text-fg"
        aria-label={t('close')}
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export interface ToastContainerProps {
  toasts: ToastItem[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  const t = useTranslations('toast');
  const ref = useRef<HTMLElement>(null);

  // Re-show the popover whenever toasts change so it stacks above any open dialog.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof el.showPopover !== 'function') return;
    try {
      if (el.matches(':popover-open')) el.hidePopover();
      if (toasts.length > 0) el.showPopover();
    } catch {
      // Popover API unavailable: the fixed container still renders.
    }
  }, [toasts]);

  return (
    <section
      ref={ref}
      popover="manual"
      aria-label={t('region')}
      className="pointer-events-none fixed inset-auto top-3 right-3 m-0 flex flex-col items-end gap-2 overflow-visible border-0 bg-transparent p-0"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={() => onClose(toast.id)} />
      ))}
    </section>
  );
}
