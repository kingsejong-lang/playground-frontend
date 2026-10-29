/**
 * Custom hook for managing execution history
 */

import { useState, useCallback } from 'react';
import { useLocalStore } from '@/lib/local-store';
import {
  HistoryItem,
  type NewHistoryItem,
  addHistoryItem,
  deleteHistoryItem,
  clearHistory,
  searchHistory,
  exportHistoryToJson,
  importHistoryFromJson,
  getHistoryStats,
  historyStore,
} from '@/features/execution/history';

export interface UseHistoryReturn {
  // State
  items: HistoryItem[];
  filteredItems: HistoryItem[];
  stats: ReturnType<typeof getHistoryStats>;
  searchQuery: string;
  selectedLanguage: string;
  selectedStatus: 'all' | 'success' | 'failed';

  // Actions
  addItem: (item: NewHistoryItem) => HistoryItem;
  deleteItem: (id: string) => void;
  clearAll: () => void;
  setSearchQuery: (query: string) => void;
  setSelectedLanguage: (language: string) => void;
  setSelectedStatus: (status: 'all' | 'success' | 'failed') => void;
  exportToJson: () => void;
  importFromJson: (jsonString: string) => void;
  refresh: () => void;
}

/**
 * Hook for managing execution history
 */
export function useHistory(): UseHistoryReturn {
  const items = useLocalStore(historyStore);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'success' | 'failed'>('all');

  // Re-read storage (e.g. after another tab or an older client wrote it).
  const refresh = useCallback(() => historyStore.notify(), []);

  // Add new history item
  const addItem = useCallback((item: NewHistoryItem) => {
    return addHistoryItem(item);
  }, []);

  // Delete history item
  const deleteItem = useCallback((id: string) => {
    deleteHistoryItem(id);
  }, []);

  // Clear all history
  const clearAll = useCallback(() => {
    clearHistory();
  }, []);

  // Export to JSON
  const exportToJson = useCallback(() => {
    const json = exportHistoryToJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `execution-history-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // Import from JSON
  const importFromJsonCallback = useCallback((jsonString: string) => {
    importHistoryFromJson(jsonString);
  }, []);

  // Apply filters to items
  const filteredItems = (() => {
    let result = items;

    // Apply search query
    if (searchQuery.trim()) {
      result = searchHistory(searchQuery);
    }

    // Apply language filter
    if (selectedLanguage) {
      result = result.filter(item => item.language === selectedLanguage);
    }

    // Apply status filter
    if (selectedStatus === 'success') {
      result = result.filter(item => item.success);
    } else if (selectedStatus === 'failed') {
      result = result.filter(item => !item.success);
    }

    return result;
  })();

  // Calculate stats
  const stats = getHistoryStats();

  return {
    items,
    filteredItems,
    stats,
    searchQuery,
    selectedLanguage,
    selectedStatus,
    addItem,
    deleteItem,
    clearAll,
    setSearchQuery,
    setSelectedLanguage,
    setSelectedStatus,
    exportToJson,
    importFromJson: importFromJsonCallback,
    refresh,
  };
}
