'use client';

import { useState, useEffect, useRef } from 'react';
import { useSnippets } from '@/hooks/useSnippets';
import { Snippet } from '@/lib/snippets/types';

interface SnippetLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSnippet: (code: string) => void;
  currentLanguage: string;
}

export default function SnippetLibrary({
  isOpen,
  onClose,
  onSelectSnippet,
  currentLanguage,
}: SnippetLibraryProps) {
  const {
    filteredSnippets,
    filter,
    searchQuery,
    setFilter,
    setSearchQuery,
    addSnippet,
    deleteSnippet,
    toggleFavorite,
  } = useSnippets();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newSnippet, setNewSnippet] = useState({
    title: '',
    description: '',
    code: '',
    tags: '',
  });

  const dialogRef = useRef<HTMLDivElement>(null);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Focus trap: focus the dialog when it opens
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      // Save previously focused element
      const previouslyFocused = document.activeElement as HTMLElement;

      // Focus the first focusable element in the dialog
      const focusableElements = dialogRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
      }

      // Return focus when dialog closes
      return () => {
        if (previouslyFocused) {
          previouslyFocused.focus();
        }
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddSnippet = () => {
    if (!newSnippet.title || !newSnippet.code) {
      return;
    }

    addSnippet({
      title: newSnippet.title,
      description: newSnippet.description,
      code: newSnippet.code,
      language: currentLanguage,
      tags: newSnippet.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      isFavorite: false,
    });

    setNewSnippet({ title: '', description: '', code: '', tags: '' });
    setShowAddForm(false);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="snippet-library-title"
    >
      <div
        ref={dialogRef}
        className="bg-gray-800 rounded-lg shadow-2xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 id="snippet-library-title" className="text-2xl font-bold text-white">Code Snippets</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 rounded"
            aria-label="Close snippet library"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search and Filters */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex gap-4" role="search">
            <input
              type="text"
              placeholder="Search snippets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Search snippets by title, description, code, or tags"
            />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Filter snippets"
            >
              <option value="all">All</option>
              <option value="favorites">Favorites</option>
              <option value="recent">Recent</option>
            </select>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
              aria-label={showAddForm ? "Cancel adding snippet" : "Add new snippet"}
              aria-expanded={showAddForm}
            >
              {showAddForm ? 'Cancel' : '+ Add'}
            </button>
          </div>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="p-6 border-b border-gray-700 bg-gray-750" role="form" aria-label="Add new snippet form">
            <input
              type="text"
              placeholder="Title *"
              value={newSnippet.title}
              onChange={(e) => setNewSnippet({ ...newSnippet, title: e.target.value })}
              className="w-full px-4 py-2 mb-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Snippet title"
              aria-required="true"
            />
            <textarea
              placeholder="Description"
              value={newSnippet.description}
              onChange={(e) => setNewSnippet({ ...newSnippet, description: e.target.value })}
              className="w-full px-4 py-2 mb-3 bg-gray-700 border border-gray-600 rounded-lg text-white h-20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Snippet description"
            />
            <textarea
              placeholder="Code *"
              value={newSnippet.code}
              onChange={(e) => setNewSnippet({ ...newSnippet, code: e.target.value })}
              className="w-full px-4 py-2 mb-3 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono h-32 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Snippet code"
              aria-required="true"
            />
            <input
              type="text"
              placeholder="Tags (comma separated)"
              value={newSnippet.tags}
              onChange={(e) => setNewSnippet({ ...newSnippet, tags: e.target.value })}
              className="w-full px-4 py-2 mb-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Snippet tags (comma separated)"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddSnippet}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-750 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Save snippet"
                disabled={!newSnippet.title || !newSnippet.code}
              >
                Save
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-750"
                aria-label="Cancel adding snippet"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Snippets List */}
        <div className="p-6">
          {filteredSnippets.length === 0 ? (
            <div
              className="text-center py-12 text-gray-400"
              role="status"
              aria-live="polite"
            >
              No snippets found. Create your first snippet!
            </div>
          ) : (
            <div
              className="space-y-3"
              role="list"
              aria-label={`${filteredSnippets.length} snippet${filteredSnippets.length === 1 ? '' : 's'}`}
            >
              {filteredSnippets.map((snippet) => (
                <div
                  key={snippet.id}
                  className="p-4 bg-gray-700/50 border border-gray-600 rounded-lg hover:bg-gray-700/70 transition-colors"
                  role="listitem"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white">{snippet.title}</h3>
                      {snippet.description && (
                        <p className="text-sm text-gray-400 mt-1">{snippet.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2" role="group" aria-label="Snippet actions">
                      <button
                        onClick={() => toggleFavorite(snippet.id)}
                        className={`p-2 rounded ${snippet.isFavorite ? 'text-yellow-400' : 'text-gray-400'} hover:text-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-gray-700`}
                        aria-label={snippet.isFavorite ? `Remove ${snippet.title} from favorites` : `Add ${snippet.title} to favorites`}
                        aria-pressed={snippet.isFavorite}
                      >
                        <svg className="w-5 h-5" fill={snippet.isFavorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteSnippet(snippet.id)}
                        className="p-2 text-red-400 hover:text-red-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-700"
                        aria-label={`Delete ${snippet.title} snippet`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <pre className="p-3 bg-gray-900 rounded text-sm text-gray-300 overflow-x-auto mb-2" aria-label="Snippet code preview">
                    <code>{snippet.code}</code>
                  </pre>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2" role="list" aria-label="Snippet tags">
                      {snippet.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 text-xs bg-blue-900/30 text-blue-300 rounded"
                          role="listitem"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        onSelectSnippet(snippet.code);
                        onClose();
                      }}
                      className="px-4 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-700"
                      aria-label={`Use ${snippet.title} snippet in editor`}
                    >
                      Use
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
