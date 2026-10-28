/**
 * Error Boundary component for catching and handling React errors.
 */

'use client';

import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { ReactNode, type ErrorInfo } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ErrorFallbackProps {
  error: unknown;
  resetErrorBoundary: () => void;
}

/**
 * Fallback UI component shown when an error occurs.
 * Displays error details and provides a retry button.
 */
function ErrorFallback({ error: rawError, resetErrorBoundary }: ErrorFallbackProps) {
  const t = useTranslations('errorBoundary');
  const error = rawError instanceof Error ? rawError : new Error(String(rawError));
  return (
    <div className="flex min-h-dvh items-center justify-center bg-void p-4">
      <div className="w-full max-w-xl rounded-lg border border-hair bg-raised p-6 shadow-raised" role="alert">
        <div className="mb-5 flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-err" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-semibold text-fg">{t('title')}</h2>
            <p className="mt-1 text-sm text-fg-secondary">{t('body')}</p>
          </div>
        </div>

        <details className="mb-5 rounded-md border border-hair bg-void">
          <summary className="px-3 py-2 text-sm text-fg-muted">{t('details')}</summary>
          <div className="border-t border-hair px-3 py-2">
            <p className="mb-2 font-mono text-[13px] text-err">
              {error.name}: {error.message}
            </p>
            {error.stack && <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs text-fg-muted">{error.stack}</pre>}
          </div>
        </details>

        <div className="flex gap-2">
          <Button variant="primary" onClick={resetErrorBoundary}>
            {t('retry')}
          </Button>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            {t('reload')}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

/**
 * Error boundary wrapper that catches errors in child components.
 * Logs errors and displays a fallback UI.
 *
 * @param children - Child components to wrap
 */
export function ErrorBoundary({ children }: ErrorBoundaryProps) {
  const handleError = (rawError: unknown, errorInfo: ErrorInfo) => {
    const error = rawError instanceof Error ? rawError : new Error(String(rawError));
    // Log to error tracking service (e.g., Sentry)
    console.error('[ErrorBoundary] Caught error:', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });

    // In production, you would send this to an error tracking service:
    // Sentry.captureException(error, { contexts: { react: errorInfo } });
  };

  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={handleError}
    >
      {children}
    </ReactErrorBoundary>
  );
}
