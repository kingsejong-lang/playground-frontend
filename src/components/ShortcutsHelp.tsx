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
    // Execution
    {
      category: 'Execution',
      keys: formatShortcut('Enter', { ctrl: true }),
      description: 'Run code',
    },
    {
      category: 'Execution',
      keys: formatShortcut('k', { ctrl: true }),
      description: 'Clear output',
    },
    // Editor
    {
      category: 'Editor',
      keys: formatShortcut('F', { ctrl: true, shift: true }),
      description: 'Format code',
    },
    // Windows & Panels
    {
      category: 'Windows & Panels',
      keys: formatShortcut(',', { ctrl: true }),
      description: 'Open settings',
    },
    {
      category: 'Windows & Panels',
      keys: formatShortcut('h', { ctrl: true }),
      description: 'Toggle history',
    },
    {
      category: 'Windows & Panels',
      keys: formatShortcut('f', { ctrl: true }),
      description: 'Toggle file tree',
    },
    {
      category: 'Windows & Panels',
      keys: formatShortcut('t', { ctrl: true }),
      description: 'Open template gallery',
    },
    {
      category: 'Windows & Panels',
      keys: formatShortcut('l', { ctrl: true }),
      description: 'Open snippet library',
    },
    {
      category: 'Windows & Panels',
      keys: '?',
      description: 'Show keyboard shortcuts',
    },
    {
      category: 'Windows & Panels',
      keys: 'Escape',
      description: 'Close modal/dialog',
    },
    // Sharing & Files
    {
      category: 'Sharing & Files',
      keys: formatShortcut('s', { ctrl: true }),
      description: 'Share code',
    },
    // View & Theme
    {
      category: 'View & Theme',
      keys: formatShortcut('/', { ctrl: true }),
      description: 'Toggle dark/light theme',
    },
    {
      category: 'View & Theme',
      keys: formatShortcut('b', { ctrl: true }),
      description: 'Toggle layout orientation',
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
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
      role="dialog"
      aria-labelledby="shortcuts-title"
      aria-modal="true"
    >
      <div
        className="rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--editor-zone)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid var(--border-hair)' }}>
          <h2 id="shortcuts-title" className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="transition-colors"
            style={{ color: 'var(--text-whisper)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-whisper)'}
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
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-whisper)' }}>
                {category}
              </h3>
              <div className="space-y-2">
                {items.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 rounded transition-colors"
                    style={{ backgroundColor: 'rgba(42, 42, 53, 0.3)' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(42, 42, 53, 0.5)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(42, 42, 53, 0.3)'}
                  >
                    <span style={{ color: 'var(--text-primary)' }}>{shortcut.description}</span>
                    <kbd
                      className="px-3 py-1.5 text-sm font-mono font-semibold rounded shadow-sm"
                      style={{
                        color: 'var(--text-primary)',
                        backgroundColor: 'var(--bg-void)',
                        border: '1px solid var(--border-hair)'
                      }}
                    >
                      {shortcut.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6" style={{ borderTop: '1px solid var(--border-hair)' }}>
          <p className="text-sm text-center" style={{ color: 'var(--text-whisper)' }}>
            Press <kbd
              className="px-2 py-1 text-xs font-mono rounded"
              style={{
                backgroundColor: 'var(--bg-void)',
                border: '1px solid var(--border-hair)'
              }}
            >?</kbd> to toggle this help
          </p>
        </div>
      </div>
    </div>
  );
}
