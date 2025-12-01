/**
 * String manipulation utility functions
 */

/**
 * Truncate a string to a maximum length with ellipsis
 * @param text - String to truncate
 * @param maxLength - Maximum length (default: 50)
 * @returns Truncated string with "..." if needed
 */
export function truncate(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Truncate code string, preserving first line if possible
 * @param code - Code string to truncate
 * @param maxLength - Maximum length (default: 50)
 * @returns Truncated code string
 */
export function truncateCode(code: string, maxLength: number = 50): string {
  const firstLine = code.split('\n')[0];
  if (firstLine.length <= maxLength) {
    return firstLine + (code.includes('\n') ? '...' : '');
  }
  return truncate(firstLine, maxLength);
}

/**
 * Generate a unique ID with prefix
 * @param prefix - Prefix for the ID (default: 'id')
 * @returns Unique ID string
 */
export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
