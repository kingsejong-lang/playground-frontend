/**
 * Custom hook for managing code snippets.
 * Provides CRUD operations and filtering for code snippets.
 */

'use client';

import { useState, useCallback } from 'react';
import { createLocalStore, useLocalStore } from '@/lib/local-store';
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

const NO_SNIPPETS: Snippet[] = Object.freeze([]) as unknown as Snippet[];

/** Stored snippets; corrupt or invalid entries are dropped. */
function parseStoredSnippets(raw: string | null): Snippet[] {
  if (!raw) return NO_SNIPPETS;
  try {
    return parseSnippets(JSON.parse(raw));
  } catch {
    return NO_SNIPPETS; // corrupt storage: start empty
  }
}

const snippetsStore = createLocalStore(STORAGE_KEYS.SNIPPETS, parseStoredSnippets, NO_SNIPPETS);

/** Applies a change to the stored snippets. */
function updateSnippets(change: (snippets: Snippet[]) => Snippet[]) {
  snippetsStore.set(change(snippetsStore.getSnapshot()));
}

export function useSnippets(): UseSnippetsReturn {
  const snippets = useLocalStore(snippetsStore);
  const [filter, setFilter] = useState<SnippetFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

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

    updateSnippets((list) => [...list, newSnippet]);
  }, []);

  // Update snippet
  const updateSnippet = useCallback((id: string, updates: Partial<Snippet>) => {
    updateSnippets((list) =>
      list.map(snippet =>
        snippet.id === id
          ? { ...snippet, ...updates, updatedAt: Date.now() }
          : snippet
      )
    );
  }, []);

  // Delete snippet
  const deleteSnippet = useCallback((id: string) => {
    updateSnippets((list) => list.filter(snippet => snippet.id !== id));
  }, []);

  // Toggle favorite
  const toggleFavorite = useCallback((id: string) => {
    updateSnippets((list) =>
      list.map(snippet =>
        snippet.id === id
          ? { ...snippet, isFavorite: !snippet.isFavorite, updatedAt: Date.now() }
          : snippet
      )
    );
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
      updateSnippets((list) => [...list, ...imported]);
    } catch {
      throw new Error('Invalid snippet data');
    }
  }, []);

  // Clear all snippets
  const clearAll = useCallback(() => {
    snippetsStore.set([]);
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
