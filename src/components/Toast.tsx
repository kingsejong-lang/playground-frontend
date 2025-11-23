/**
 * Toast notification component.
 * Displays temporary notifications with auto-dismiss functionality.
 */

import { useEffect } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastProps {
  id: string
  type: ToastType
  message: string
  duration?: number
  onClose: () => void
}

export function Toast({ id, type, message, duration = 5000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [onClose, duration])

  const colors = {
    success: { bg: 'rgba(63, 182, 139, 0.15)', border: 'var(--accent-green)' },
    error: { bg: 'rgba(232, 69, 69, 0.15)', border: 'var(--accent-crimson)' },
    warning: { bg: 'rgba(255, 193, 7, 0.15)', border: '#ffc107' },
    info: { bg: 'rgba(76, 95, 213, 0.15)', border: 'var(--accent-indigo)' },
  }

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  }

  return (
    <div
      className="border rounded-lg p-4 shadow-lg mb-2 animate-slide-in-right min-w-[320px] max-w-md"
      style={{
        backgroundColor: colors[type].bg,
        borderColor: colors[type].border,
      }}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span
          className="text-xl font-bold flex-shrink-0"
          style={{ color: colors[type].border }}
        >
          {icons[type]}
        </span>
        <p className="text-sm flex-1 break-words" style={{ color: 'var(--text-primary)' }}>{message}</p>
        <button
          onClick={onClose}
          className="transition-colors ml-2 flex-shrink-0"
          style={{ color: 'var(--text-whisper)' }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-whisper)'}
          aria-label="Close notification"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

/**
 * Toast container that holds multiple toast notifications.
 */
export interface ToastContainerProps {
  toasts: Array<{
    id: string
    type: ToastType
    message: string
    duration?: number
  }>
  onClose: (id: string) => void
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col items-end gap-2"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          type={toast.type}
          message={toast.message}
          duration={toast.duration}
          onClose={() => onClose(toast.id)}
        />
      ))}
    </div>
  )
}
