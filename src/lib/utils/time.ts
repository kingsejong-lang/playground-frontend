/**
 * Time-related utility functions
 */

import { TIME_MS } from '../constants';

/**
 * Format a timestamp as a relative time string (e.g., "5 minutes ago")
 * @param timestamp - ISO timestamp string or Date
 * @returns Formatted relative time string
 */
export function formatRelativeTime(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // Less than 1 minute
  if (diff < TIME_MS.MINUTE) {
    return 'Just now';
  }

  // Less than 1 hour
  if (diff < TIME_MS.HOUR) {
    const minutes = Math.floor(diff / TIME_MS.MINUTE);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }

  // Less than 1 day
  if (diff < TIME_MS.DAY) {
    const hours = Math.floor(diff / TIME_MS.HOUR);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }

  // More than 1 day - show full date
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

/**
 * Format duration in milliseconds to human readable string
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string (e.g., "1.5s", "250ms")
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}
