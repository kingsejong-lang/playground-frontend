/**
 * Execution history storage (localStorage key `playground_execution_history`).
 *
 * Stored values are untrusted (other tabs, older app versions, imported files),
 * so every read is validated with Zod. Entries written by the previous REST
 * client (`ExecuteResponse` shape) are converted to `ExecutionResult`.
 */

import { z } from '@/lib/zod';
import type { ExecutionResult } from '@/lib/rpc';

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
  output: ExecutionResult;
  success: boolean;
}

const StreamSchema = z.enum(['stdout', 'stderr']);

const ExecutionResultSchema = z.object({
  executionId: z.string().optional(),
  status: z.string(),
  success: z.boolean(),
  exitCode: z.number().optional(),
  chunks: z.array(z.object({ stream: StreamSchema, text: z.string() })),
  diagnostics: z
    .array(
      z.object({
        severity: z.enum(['error', 'warning', 'info']),
        message: z.string(),
        path: z.string(),
        line: z.number(),
        column: z.number(),
        code: z.string(),
      })
    )
    .default([]),
  truncated: z.array(z.object({ stream: StreamSchema, droppedBytes: z.number() })).default([]),
  metrics: z
    .object({
      wallTimeMs: z.number(),
      cpuTimeMs: z.number(),
      peakMemoryBytes: z.number(),
      stdoutBytes: z.number(),
      stderrBytes: z.number(),
      queueTimeMs: z.number(),
    })
    .optional(),
  message: z.string().optional(),
  gaps: z.number().default(0),
  reconnected: z.boolean().default(false),
  phase: z.enum(['compile', 'run']).optional(),
  queuePosition: z.number().optional(),
});

/** Output shape written by the REST client before the Connect migration. */
const LegacyOutputSchema = z.object({
  success: z.boolean(),
  events: z.array(z.object({ kind: z.string(), message: z.string() })),
  metrics: z
    .object({ compile_time_ms: z.number().optional(), run_time_ms: z.number().optional(), memory_bytes: z.number().optional() })
    .optional(),
  error: z.object({ code: z.string(), message: z.string(), details: z.string().optional() }).optional(),
});

export function fromLegacyOutput(legacy: z.infer<typeof LegacyOutputSchema>): ExecutionResult {
  const chunks: ExecutionResult['chunks'] = [];
  const diagnostics: ExecutionResult['diagnostics'] = [];
  for (const e of legacy.events) {
    if (e.kind === 'KIND_COMPILE') {
      diagnostics.push({ severity: 'info', message: e.message, path: '', line: 0, column: 0, code: '' });
    } else {
      chunks.push({ stream: e.kind === 'KIND_STDERR' ? 'stderr' : 'stdout', text: e.message });
    }
  }
  return {
    status: legacy.success ? 'succeeded' : 'failed',
    success: legacy.success,
    chunks,
    diagnostics,
    truncated: [],
    metrics: legacy.metrics
      ? {
          wallTimeMs: legacy.metrics.run_time_ms ?? 0,
          cpuTimeMs: 0,
          peakMemoryBytes: legacy.metrics.memory_bytes ?? 0,
          stdoutBytes: 0,
          stderrBytes: 0,
          queueTimeMs: 0,
        }
      : undefined,
    message: legacy.error ? `${legacy.error.code}: ${legacy.error.message}` : undefined,
    gaps: 0,
    reconnected: false,
  };
}

const HistoryItemSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  language: z.string(),
  code: z.string(),
  args: z.string().optional(),
  stdin: z.string().optional(),
  output: z.union([
    ExecutionResultSchema,
    LegacyOutputSchema.transform(fromLegacyOutput),
  ]),
  success: z.boolean(),
});

/** Parses untrusted JSON data into history items, dropping invalid entries. */
export function parseHistoryItems(data: unknown): HistoryItem[] {
  if (!Array.isArray(data)) return [];
  const items: HistoryItem[] = [];
  for (const raw of data) {
    const parsed = HistoryItemSchema.safeParse(raw);
    if (parsed.success) items.push(parsed.data as HistoryItem);
  }
  return items;
}

/** All text of a result (stdout, stderr, diagnostics, message) for search/copy. */
export function resultText(result: ExecutionResult): string {
  return [
    ...result.diagnostics.map((d) => d.message),
    ...result.chunks.map((c) => c.text),
    result.message ?? '',
  ]
    .filter(Boolean)
    .join('\n');
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

    const parsed = parseHistoryItems(JSON.parse(stored));

    // Sort by timestamp descending (newest first)
    return parsed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch {
    // Corrupt storage: behave as empty history.
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

    // Search in output text
    if (resultText(item.output).toLowerCase().includes(lowerQuery)) {
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
    const parsed: unknown = JSON.parse(jsonString);

    // Validate items (imported files are user input)
    if (!Array.isArray(parsed)) {
      throw new Error('Invalid history data: not an array');
    }

    const items = parseHistoryItems(parsed);

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
