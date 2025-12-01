/**
 * Application-wide constants
 * Centralizes magic numbers and configuration values
 */

/** Time constants in milliseconds */
export const TIME_MS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
} as const;

/** LocalStorage keys */
export const STORAGE_KEYS = {
  THEME: 'kingsejong-theme',
  LAYOUT: 'kingsejong-layout',
  SNIPPETS: 'kingsejong-snippets',
  HISTORY: 'kingsejong-history',
} as const;

/** Editor configuration limits */
export const EDITOR_LIMITS = {
  FONT_SIZE: { min: 10, max: 24 },
  TAB_SIZE: { min: 2, max: 8, step: 2 },
  CODE_MAX_SIZE_KB: 500,
} as const;

/** Default file extension */
export const DEFAULT_FILE_EXTENSION = '.txt';

/** API retry configuration */
export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  INITIAL_DELAY_MS: 100,
  MAX_DELAY_MS: 1000,
} as const;

/** WebSocket configuration */
export const WEBSOCKET_CONFIG = {
  HEARTBEAT_INTERVAL_MS: 30000,
  RECONNECT_DELAY_MS: 1000,
  MAX_RECONNECT_ATTEMPTS: 5,
} as const;

/** SSE configuration */
export const SSE_CONFIG = {
  MAX_RETRIES: 5,
  INITIAL_RETRY_DELAY_MS: 1000,
  MAX_RETRY_DELAY_MS: 30000,
} as const;
