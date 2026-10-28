/**
 * Time-related utility functions
 */

import { TIME_MS } from '../constants';

/**
 * Format a timestamp relative to now in the given locale ("3분 전", "3 minutes ago").
 * Older than a day: the localized date and time.
 * @param timestamp - ISO timestamp string or Date
 * @param locale - BCP 47 locale, e.g. "ko" or "en"
 */
export function formatRelativeTime(timestamp: string | Date, locale: string = 'en'): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const diff = Date.now() - date.getTime();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (diff < TIME_MS.MINUTE) return rtf.format(0, 'second');
  if (diff < TIME_MS.HOUR) return rtf.format(-Math.floor(diff / TIME_MS.MINUTE), 'minute');
  if (diff < TIME_MS.DAY) return rtf.format(-Math.floor(diff / TIME_MS.HOUR), 'hour');
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
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
