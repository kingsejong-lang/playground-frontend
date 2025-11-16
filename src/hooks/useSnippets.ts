/**
 * Custom hook for managing code snippets.
 * Provides CRUD operations and filtering for code snippets.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Snippet, SnippetFilter } from '@/lib/snippets/types';

const STORAGE_KEY = 'kingsejong-snippets';

interface UseSnippetsReturn {
  snippets: Snippet[];
  filteredSnippets: Snippet[];
  filter: SnippetFilter;
  searchQuery: string;
  setFilter: (filter: SnippetFilter) => void;
  setSearchQuery: (query: string) => void;
  addSnippet: (snippet: Omit<Snippet, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateSnippet: (id: string, updates: Partial<Snippet>) => void;
  deleteSnippet: (id: string) => void;
  toggleFavorite: (id: string) => void;
  getSnippet: (id: string) => Snippet | undefined;
  exportSnippets: () => string;
  importSnippets: (data: string) => void;
  clearAll: () => void;
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `snippet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Load snippets from localStorage
 */
function loadSnippets(): Snippet[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load snippets:', error);
  }

  return [];
}

/**
 * Save snippets to localStorage
 */
function saveSnippets(snippets: Snippet[]) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snippets));
  } catch (error) {
    console.error('Failed to save snippets:', error);
  }
}

export function useSnippets(): UseSnippetsReturn {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [filter, setFilter] = useState<SnippetFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Load snippets on mount
  useEffect(() => {
    const loaded = loadSnippets();
    setSnippets(loaded);
  }, []);

  // Add snippet
  const addSnippet = useCallback((snippet: Omit<Snippet, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newSnippet: Snippet = {
      ...snippet,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setSnippets(prev => {
      const updated = [...prev, newSnippet];
      saveSnippets(updated);
      return updated;
    });
  }, []);

  // Update snippet
  const updateSnippet = useCallback((id: string, updates: Partial<Snippet>) => {
    setSnippets(prev => {
      const updated = prev.map(snippet =>
        snippet.id === id
          ? { ...snippet, ...updates, updatedAt: Date.now() }
          : snippet
      );
      saveSnippets(updated);
      return updated;
    });
  }, []);

  // Delete snippet
  const deleteSnippet = useCallback((id: string) => {
    setSnippets(prev => {
      const updated = prev.filter(snippet => snippet.id !== id);
      saveSnippets(updated);
      return updated;
    });
  }, []);

  // Toggle favorite
  const toggleFavorite = useCallback((id: string) => {
    setSnippets(prev => {
      const updated = prev.map(snippet =>
        snippet.id === id
          ? { ...snippet, isFavorite: !snippet.isFavorite, updatedAt: Date.now() }
          : snippet
      );
      saveSnippets(updated);
      return updated;
    });
  }, []);

  // Get snippet by ID
  const getSnippet = useCallback((id: string): Snippet | undefined => {
    return snippets.find(snippet => snippet.id === id);
  }, [snippets]);

  // Export snippets
  const exportSnippets = useCallback((): string => {
    return JSON.stringify(snippets, null, 2);
  }, [snippets]);

  // Import snippets
  const importSnippets = useCallback((data: string) => {
    try {
      const imported = JSON.parse(data) as Snippet[];
      setSnippets(prev => {
        const updated = [...prev, ...imported];
        saveSnippets(updated);
        return updated;
      });
    } catch (error) {
      console.error('Failed to import snippets:', error);
      throw new Error('Invalid snippet data');
    }
  }, []);

  // Clear all snippets
  const clearAll = useCallback(() => {
    setSnippets([]);
    saveSnippets([]);
  }, []);

  // Filter snippets
  const filteredSnippets = snippets.filter(snippet => {
    // Apply filter
    if (filter === 'favorites' && !snippet.isFavorite) {
      return false;
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        snippet.title.toLowerCase().includes(query) ||
        snippet.description.toLowerCase().includes(query) ||
        snippet.code.toLowerCase().includes(query) ||
        snippet.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return true;
  }).sort((a, b) => {
    // Sort by recent if filter is 'recent'
    if (filter === 'recent') {
      return b.updatedAt - a.updatedAt;
    }
    // Otherwise sort by favorites first, then by updated date
    if (a.isFavorite !== b.isFavorite) {
      return a.isFavorite ? -1 : 1;
    }
    return b.updatedAt - a.updatedAt;
  });

  return {
    snippets,
    filteredSnippets,
    filter,
    searchQuery,
    setFilter,
    setSearchQuery,
    addSnippet,
    updateSnippet,
    deleteSnippet,
    toggleFavorite,
    getSnippet,
    exportSnippets,
    importSnippets,
    clearAll,
  };
}
