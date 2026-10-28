/**
 * Custom hook for managing execution history
 */

import { useState, useCallback, useEffect } from 'react';
import {
  HistoryItem,
  getHistoryItems,
  addHistoryItem,
  deleteHistoryItem,
  clearHistory,
  searchHistory,
  exportHistoryToJson,
  importHistoryFromJson,
  getHistoryStats,
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
  addItem: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => HistoryItem;
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
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'success' | 'failed'>('all');

  // Refresh items from localStorage
  const refresh = useCallback(() => {
    const loadedItems = getHistoryItems();
    setItems(loadedItems);
  }, []);

  // Load items on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Add new history item
  const addItem = useCallback((item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    const newItem = addHistoryItem(item);
    refresh();
    return newItem;
  }, [refresh]);

  // Delete history item
  const deleteItem = useCallback((id: string) => {
    deleteHistoryItem(id);
    refresh();
  }, [refresh]);

  // Clear all history
  const clearAll = useCallback(() => {
    clearHistory();
    refresh();
  }, [refresh]);

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
    refresh();
  }, [refresh]);

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
