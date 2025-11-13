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
    success: 'bg-green-600 border-green-500',
    error: 'bg-red-600 border-red-500',
    warning: 'bg-yellow-600 border-yellow-500',
    info: 'bg-blue-600 border-blue-500',
  }

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  }

  return (
    <div
      className={`${colors[type]} border rounded-lg p-4 shadow-lg mb-2 animate-slide-in-right min-w-[320px] max-w-md`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span className="text-white text-xl font-bold flex-shrink-0">
          {icons[type]}
        </span>
        <p className="text-white text-sm flex-1 break-words">{message}</p>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-200 transition-colors ml-2 flex-shrink-0"
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
