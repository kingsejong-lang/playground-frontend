/**
 * Toast context for managing toast notifications across the app.
 *
 * Usage:
 *   const toast = useToast();
 *   toast.success('저장했어요');
 *   toast.info('템플릿을 불러왔어요', { action: { label: '되돌리기', onClick: undo } });
 */

'use client';

import { createContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { ToastContainer } from '@/components/Toast';
import type { ToastAction, ToastItem, ToastType } from '@/components/Toast';

export interface ToastOptions {
  duration?: number;
  action?: ToastAction;
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string, options?: ToastOptions) => void;
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
  warning: (message: string, options?: ToastOptions) => void;
  info: (message: string, options?: ToastOptions) => void;
}

export const ToastContext = createContext<ToastContextValue | undefined>(undefined);

/** At most this many toasts are visible; older ones are dropped. */
const MAX_TOASTS = 4;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((type: ToastType, message: string, options: ToastOptions = {}) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message, ...options }].slice(-MAX_TOASTS));
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      success: (message, options) => showToast('success', message, options),
      error: (message, options) => showToast('error', message, options),
      warning: (message, options) => showToast('warning', message, options),
      info: (message, options) => showToast('info', message, options),
    }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
}
