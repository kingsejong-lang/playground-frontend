/**
 * Custom hook for displaying toast notifications.
 */

import { useContext } from 'react'
import { ToastContext } from '@/contexts/ToastContext'

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    console.error('useToast must be used within ToastProvider')
    // Return a fallback context to prevent runtime errors
    return {
      showToast: () => {},
      success: () => {},
      error: () => {},
      warning: () => {},
      info: () => {},
    }
  }

  return context
}
