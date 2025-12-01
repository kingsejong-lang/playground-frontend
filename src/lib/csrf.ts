/**
 * CSRF Token Management
 * Handles CSRF token caching, retrieval, and lifecycle.
 */

import axios from 'axios';
import { TIME_MS } from '@/lib/constants';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// CSRF token cache (5 minutes, same as backend)
const CSRF_CACHE_DURATION = 5 * TIME_MS.MINUTE;

let csrfToken: string | null = null;
let csrfExpiresAt: number = 0;

/**
 * Get CSRF token with caching
 * Returns cached token if valid, otherwise fetches new one
 */
export async function getCsrfToken(): Promise<string> {
  // Return cached token if still valid
  if (csrfToken && Date.now() < csrfExpiresAt) {
    return csrfToken;
  }

  try {
    const response = await axios.get(`${API_URL}/api/v1/csrf/token`, {
      withCredentials: true,
    });

    const token = response.data.csrf_token;
    if (!token) {
      throw new Error('CSRF token not found in response');
    }

    csrfToken = token;
    csrfExpiresAt = Date.now() + CSRF_CACHE_DURATION;
    return token;
  } catch (error) {
    console.error('Failed to get CSRF token:', error);
    throw error;
  }
}

/**
 * Clear CSRF token cache
 * Called on logout or when token is invalidated
 */
export function clearCsrfCache(): void {
  csrfToken = null;
  csrfExpiresAt = 0;
}

/**
 * Check if a request method requires CSRF protection
 */
export function requiresCsrf(method: string): boolean {
  return ['post', 'put', 'delete', 'patch'].includes(method.toLowerCase());
}
