/**
 * Security utilities for input sanitization and validation
 */

/**
 * Sanitize HTML to prevent XSS attacks
 * Removes potentially dangerous HTML tags and attributes
 */
export function sanitizeHTML(input: string): string {
  if (typeof input !== 'string') return '';

  // Remove script tags and their content
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove iframe tags
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

  // Remove object and embed tags
  sanitized = sanitized.replace(/<(object|embed)[^>]*>/gi, '');

  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Remove data: URIs that could contain scripts
  sanitized = sanitized.replace(/data:text\/html/gi, '');

  return sanitized;
}

/**
 * Escape HTML special characters
 */
export function escapeHTML(input: string): string {
  if (typeof input !== 'string') return '';

  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return input.replace(/[&<>"'/]/g, (char) => htmlEscapeMap[char] || char);
}

/**
 * Validate and sanitize URL
 * Only allows http, https, and relative URLs
 */
export function sanitizeURL(url: string): string | null {
  if (typeof url !== 'string') return null;

  const trimmedURL = url.trim();

  // Empty URLs are allowed
  if (!trimmedURL) return '';

  // Relative URLs are allowed
  if (trimmedURL.startsWith('/') || trimmedURL.startsWith('#')) {
    return trimmedURL;
  }

  // Only allow http and https protocols
  try {
    const parsedURL = new URL(trimmedURL);
    if (parsedURL.protocol === 'http:' || parsedURL.protocol === 'https:') {
      return trimmedURL;
    }
  } catch {
    // Invalid URL
    return null;
  }

  return null;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  if (typeof email !== 'string') return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 320; // RFC 5321
}

/**
 * Sanitize string for use in RegExp
 * Escapes special regex characters
 */
export function escapeRegExp(input: string): string {
  if (typeof input !== 'string') return '';

  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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

/**
 * Rate limiting helper
 * Returns true if action should be allowed
 */
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();

  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 60000 // 1 minute
  ) {}

  /**
   * Check if action is allowed for the given key
   */
  check(key: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];

    // Remove old attempts outside the time window
    const recentAttempts = attempts.filter((timestamp) => now - timestamp < this.windowMs);

    if (recentAttempts.length >= this.maxAttempts) {
      return false;
    }

    // Add current attempt
    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);

    return true;
  }

  /**
   * Reset attempts for a key
   */
  reset(key: string): void {
    this.attempts.delete(key);
  }

  /**
   * Clear all rate limit data
   */
  clear(): void {
    this.attempts.clear();
  }
}
