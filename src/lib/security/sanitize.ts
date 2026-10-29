/**
 * Validation for user-provided snippet data (stored locally; never rendered as HTML).
 */

/**
 * Validate and sanitize snippet title
 * Remove control characters and limit length
 */
export function sanitizeSnippetTitle(title: string): string {
  if (typeof title !== 'string') return '';

  // Remove control characters
  let sanitized = title.replace(/[\x00-\x1F\x7F]/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Limit length
  return sanitized.slice(0, 200);
}

/**
 * Validate and sanitize snippet tags
 * Returns array of clean tag strings
 */
export function sanitizeSnippetTags(tags: string[]): string[] {
  if (!Array.isArray(tags)) return [];

  return tags
    .filter((tag) => typeof tag === 'string')
    .map((tag) => tag.trim().replace(/[\x00-\x1F\x7F]/g, ''))
    .filter((tag) => tag.length > 0 && tag.length <= 50)
    .slice(0, 20); // Maximum 20 tags
}

/**
 * Validate snippet code size
 * Prevents excessively large code snippets
 */
export function validateCodeSize(code: string, maxSizeKB: number = 500): boolean {
  if (typeof code !== 'string') return false;

  const sizeInBytes = new Blob([code]).size;
  const sizeInKB = sizeInBytes / 1024;

  return sizeInKB <= maxSizeKB;
}
