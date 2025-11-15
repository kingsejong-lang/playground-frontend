/**
 * Execution history storage utility
 * Manages code execution history in localStorage
 */

import { ExecuteResponse } from './api';
import { isArray } from './guards';

/**
 * History item interface
 */
export interface HistoryItem {
  id: string;
  timestamp: string;
  language: string;
  code: string;
  args?: string;
  stdin?: string;
  output: ExecuteResponse;
  success: boolean;
}

/**
 * History storage key
 */
const HISTORY_STORAGE_KEY = 'playground_execution_history';

/**
 * Maximum number of history items to store
 */
const MAX_HISTORY_ITEMS = 100;

/**
 * Get all history items from localStorage
 */
export function getHistoryItems(): HistoryItem[] {
  try {
    if (typeof window === 'undefined') {
      return [];
    }

    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);

    // Validate that parsed data is an array
    if (!isArray<HistoryItem>(parsed)) {
      console.error('Invalid history data: not an array');
      return [];
    }

    // Sort by timestamp descending (newest first)
    return parsed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) {
    console.error('Failed to load history items:', error);
    return [];
  }
}

/**
 * Add a history item
 */
export function addHistoryItem(item: Omit<HistoryItem, 'id' | 'timestamp'>): HistoryItem {
  try {
    const newItem: HistoryItem = {
      ...item,
      id: generateHistoryId(),
      timestamp: new Date().toISOString(),
    };

    const items = getHistoryItems();

    // Add new item at the beginning
    items.unshift(newItem);

    // Limit to MAX_HISTORY_ITEMS
    const limitedItems = items.slice(0, MAX_HISTORY_ITEMS);

    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(limitedItems));
    }

    return newItem;
  } catch (error) {
    console.error('Failed to add history item:', error);
    throw error;
  }
}

/**
 * Get a single history item by ID
 */
export function getHistoryItem(id: string): HistoryItem | null {
  const items = getHistoryItems();
  return items.find(item => item.id === id) || null;
}

/**
 * Delete a history item by ID
 */
export function deleteHistoryItem(id: string): void {
  try {
    const items = getHistoryItems();
    const filtered = items.filter(item => item.id !== id);

    if (typeof window !== 'undefined') {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(filtered));
    }
  } catch (error) {
    console.error('Failed to delete history item:', error);
    throw error;
  }
}

/**
 * Delete all history items
 */
export function clearHistory(): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    }
  } catch (error) {
    console.error('Failed to clear history:', error);
    throw error;
  }
}

/**
 * Search history items by query
 */
export function searchHistory(query: string): HistoryItem[] {
  const items = getHistoryItems();

  if (!query.trim()) {
    return items;
  }

  const lowerQuery = query.toLowerCase();

  return items.filter(item => {
    // Search in code
    if (item.code.toLowerCase().includes(lowerQuery)) {
      return true;
    }

    // Search in language
    if (item.language.toLowerCase().includes(lowerQuery)) {
      return true;
    }

    // Search in output events
    if (item.output.events.some(event => event.message.toLowerCase().includes(lowerQuery))) {
      return true;
    }

    return false;
  });
}

/**
 * Filter history items by language
 */
export function filterHistoryByLanguage(language: string): HistoryItem[] {
  const items = getHistoryItems();

  if (!language) {
    return items;
  }

  return items.filter(item => item.language === language);
}

/**
 * Filter history items by success status
 */
export function filterHistoryByStatus(success: boolean): HistoryItem[] {
  const items = getHistoryItems();
  return items.filter(item => item.success === success);
}

/**
 * Export history to JSON
 */
export function exportHistoryToJson(): string {
  const items = getHistoryItems();
  return JSON.stringify(items, null, 2);
}

/**
 * Import history from JSON
 */
export function importHistoryFromJson(jsonString: string): void {
  try {
    const parsed = JSON.parse(jsonString);

    // Validate items
    if (!isArray<HistoryItem>(parsed)) {
      console.error('Invalid history data: not an array');
      return;
    }

    const items = parsed;

    // Merge with existing items and remove duplicates
    const existingItems = getHistoryItems();
    const allItems = [...items, ...existingItems];

    // Remove duplicates by ID
    const uniqueItems = Array.from(
      new Map(allItems.map(item => [item.id, item])).values()
    );

    // Sort by timestamp and limit
    const sortedItems = uniqueItems
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, MAX_HISTORY_ITEMS);

    if (typeof window !== 'undefined') {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(sortedItems));
    }
  } catch (error) {
    console.error('Failed to import history:', error);
    throw error;
  }
}

/**
 * Generate a unique history ID
 */
function generateHistoryId(): string {
  return `hist_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get history statistics
 */
export function getHistoryStats() {
  const items = getHistoryItems();

  const total = items.length;
  const successful = items.filter(item => item.success).length;
  const failed = total - successful;

  // Count by language
  const byLanguage: Record<string, number> = {};
  items.forEach(item => {
    byLanguage[item.language] = (byLanguage[item.language] || 0) + 1;
  });

  // Get most recent execution
  const mostRecent = items[0] || null;

  return {
    total,
    successful,
    failed,
    successRate: total > 0 ? (successful / total) * 100 : 0,
    byLanguage,
    mostRecent,
  };
}
