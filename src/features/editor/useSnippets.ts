/**
 * Custom hook for managing code snippets.
 * Provides CRUD operations and filtering for code snippets.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { parseSnippets, type Snippet, type SnippetFilter } from './snippet-types';
import {
  sanitizeSnippetTitle,
  sanitizeSnippetTags,
  validateCodeSize,
} from '@/lib/security/sanitize';
import { STORAGE_KEYS, EDITOR_LIMITS } from '@/lib/constants';
import { generateId } from '@/lib/utils/string';

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
 * Load snippets from localStorage
 */
function loadSnippets(): Snippet[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SNIPPETS);
    if (stored) {
      return parseSnippets(JSON.parse(stored));
    }
  } catch {
    // Corrupt storage: start empty.
  }

  return [];
}

/**
 * Save snippets to localStorage
 */
function saveSnippets(snippets: Snippet[]) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEYS.SNIPPETS, JSON.stringify(snippets));
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
    // Validate and sanitize inputs
    const sanitizedTitle = sanitizeSnippetTitle(snippet.title);
    const sanitizedDescription = sanitizeSnippetTitle(snippet.description); // Use same validation
    const sanitizedTags = sanitizeSnippetTags(snippet.tags);

    // Validate title
    if (!sanitizedTitle || sanitizedTitle.length === 0) {
      throw new Error('Snippet title is required');
    }

    // Validate code
    if (!snippet.code || snippet.code.trim().length === 0) {
      throw new Error('Snippet code is required');
    }

    // Validate code size
    if (!validateCodeSize(snippet.code, EDITOR_LIMITS.CODE_MAX_SIZE_KB)) {
      throw new Error(`Snippet code is too large (max ${EDITOR_LIMITS.CODE_MAX_SIZE_KB}KB)`);
    }

    const newSnippet: Snippet = {
      ...snippet,
      title: sanitizedTitle,
      description: sanitizedDescription,
      tags: sanitizedTags,
      id: generateId('snippet'),
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
      const parsed: unknown = JSON.parse(data);
      if (!Array.isArray(parsed)) throw new Error('not an array');
      const imported = parseSnippets(parsed);
      setSnippets(prev => {
        const updated = [...prev, ...imported];
        saveSnippets(updated);
        return updated;
      });
    } catch {
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
