/**
 * Error Boundary component for catching and handling React errors.
 * Follows the code quality standards defined in system_prompt_additions.md
 */

'use client';

import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { ReactNode, type ErrorInfo } from 'react';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

/**
 * Fallback UI component shown when an error occurs.
 * Displays error details and provides a retry button.
 */
function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-8 max-w-2xl w-full">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-shrink-0">
            <svg
              className="w-8 h-8 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-red-400 mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-300 mb-4">
              The application encountered an unexpected error. You can try reloading the page or contact support if the problem persists.
            </p>
          </div>
        </div>

        <div className="mb-6">
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-gray-400 hover:text-gray-300 mb-2">
              Error Details
            </summary>
            <div className="mt-2 p-4 bg-gray-950 rounded border border-gray-700">
              <p className="text-sm font-semibold text-red-400 mb-2">
                {error.name}: {error.message}
              </p>
              {error.stack && (
                <pre className="text-xs text-gray-400 overflow-auto max-h-48 whitespace-pre-wrap break-words">
                  {error.stack}
                </pre>
              )}
            </div>
          </details>
        </div>

        <div className="flex gap-3">
          <button
            onClick={resetErrorBoundary}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 transition-colors rounded text-white font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 transition-colors rounded text-white font-medium focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            Reload Page
          </button>
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
  const handleError = (error: Error, errorInfo: ErrorInfo) => {
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

  const handleReset = () => {
    // Reset app state if needed
    console.log('[ErrorBoundary] Resetting error boundary');

    // In a real app, you might want to clear certain state here
    // For example, clear any corrupted data from localStorage
  };

  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={handleError}
      onReset={handleReset}
    >
      {children}
    </ReactErrorBoundary>
  );
}
