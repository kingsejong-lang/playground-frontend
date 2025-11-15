/**
 * Keyboard shortcuts help modal.
 * Displays all available keyboard shortcuts.
 */

'use client';

import { useEffect } from 'react';
import { getModifierKeyName, formatShortcut } from '@/hooks/useKeyboardShortcut';

interface ShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Shortcut {
  keys: string;
  description: string;
  category: string;
}

export function ShortcutsHelp({ isOpen, onClose }: ShortcutsHelpProps) {
  const modKey = getModifierKeyName();

  const shortcuts: Shortcut[] = [
    {
      category: 'Execution',
      keys: formatShortcut('Enter', { ctrl: true }),
      description: 'Run code',
    },
    {
      category: 'Execution',
      keys: formatShortcut('Enter', { ctrl: true, shift: true }),
      description: 'Run code (streaming)',
    },
    {
      category: 'Execution',
      keys: formatShortcut('k', { ctrl: true }),
      description: 'Clear output',
    },
    {
      category: 'Editor',
      keys: formatShortcut('s', { ctrl: true }),
      description: 'Save settings',
    },
    {
      category: 'UI',
      keys: formatShortcut(',', { ctrl: true }),
      description: 'Open settings',
    },
    {
      category: 'UI',
      keys: formatShortcut('h', { ctrl: true }),
      description: 'Open history',
    },
    {
      category: 'UI',
      keys: '?',
      description: 'Show keyboard shortcuts',
    },
    {
      category: 'UI',
      keys: 'Escape',
      description: 'Close modal/dialog',
    },
  ];

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
      role="dialog"
      aria-labelledby="shortcuts-title"
      aria-modal="true"
    >
      <div
        className="bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 id="shortcuts-title" className="text-2xl font-bold text-white">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close shortcuts help"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {Object.entries(groupedShortcuts).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {items.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 rounded bg-gray-700/30 hover:bg-gray-700/50 transition-colors"
                  >
                    <span className="text-gray-300">{shortcut.description}</span>
                    <kbd className="px-3 py-1.5 text-sm font-mono font-semibold text-white bg-gray-700 border border-gray-600 rounded shadow-sm">
                      {shortcut.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700">
          <p className="text-sm text-gray-400 text-center">
            Press <kbd className="px-2 py-1 text-xs font-mono bg-gray-700 border border-gray-600 rounded">?</kbd> to toggle this help
          </p>
        </div>
      </div>
    </div>
  );
}
