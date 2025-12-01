/**
 * Playground modals container component
 */

'use client';

import dynamicImport from 'next/dynamic';
import { Language, EditorSettings, ThemeSettings } from '@/lib/api';
import { HistoryItem } from '@/lib/history';

// Dynamic imports for modals
const SettingsModal = dynamicImport(() => import('@/components/SettingsModal'));
const AuthModal = dynamicImport(() => import('@/components/AuthModal'));
const HistorySidebar = dynamicImport(() => import('@/components/HistorySidebar'));
const ShortcutsHelp = dynamicImport(() =>
  import('@/components/ShortcutsHelp').then((mod) => ({ default: mod.ShortcutsHelp }))
);
const TemplateGallery = dynamicImport(() =>
  import('@/components/TemplateGallery').then((mod) => ({ default: mod.TemplateGallery }))
);
const SnippetLibrary = dynamicImport(() => import('@/components/SnippetLibrary'));

interface ShareModalProps {
  shareUrl: string;
  shareId: string;
  onCopy: () => void;
  onCopyEmbed: () => void;
  onClose: () => void;
}

/**
 * Share URL Modal
 */
export function ShareModal({
  shareUrl,
  shareId,
  onCopy,
  onCopyEmbed,
  onClose,
}: ShareModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="dialog"
      aria-labelledby="share-modal-title"
      aria-modal="true"
    >
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <h3 id="share-modal-title" className="text-lg font-bold text-white mb-4">
          Share Your Code
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Your code has been shared! The URL has been copied to clipboard.
        </p>

        {/* Share URL */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Share URL
          </label>
          <div className="bg-gray-800 border border-gray-700 rounded p-3 mb-2">
            <code className="text-sm text-blue-400 break-all">{shareUrl}</code>
          </div>
          <button
            onClick={onCopy}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            aria-label="Copy share URL to clipboard"
          >
            Copy Share URL
          </button>
        </div>

        {/* Embed Code */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Embed Code (iframe)
          </label>
          <div className="bg-gray-800 border border-gray-700 rounded p-3 mb-2 overflow-x-auto">
            <code className="text-xs text-green-400">
              {`<iframe src="${typeof window !== 'undefined' ? window.location.origin : ''}/embed/${shareId}" width="100%" height="600" frameborder="0"></iframe>`}
            </code>
          </div>
          <button
            onClick={onCopyEmbed}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            aria-label="Copy embed code to clipboard"
          >
            Copy Embed Code
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
            aria-label="Close share modal"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

interface PlaygroundModalsProps {
  // Settings
  showSettings: boolean;
  onCloseSettings: () => void;
  onSaveSettings: (editor: EditorSettings, theme: ThemeSettings) => void;
  editorSettings: EditorSettings;
  themeSettings: ThemeSettings;
  // Auth
  showAuthModal: boolean;
  onCloseAuthModal: () => void;
  // Shortcuts
  showShortcutsHelp: boolean;
  onCloseShortcutsHelp: () => void;
  // History
  showHistory: boolean;
  onCloseHistory: () => void;
  onLoadHistory: (item: HistoryItem) => void;
  languages: Language[];
  // Templates
  showTemplateGallery: boolean;
  onCloseTemplateGallery: () => void;
  selectedLanguage: string;
  onSelectTemplate: (code: string) => void;
  // Snippets
  showSnippetLibrary: boolean;
  onCloseSnippetLibrary: () => void;
  onSelectSnippet: (code: string) => void;
  // Share
  shareUrl: string | null;
  shareId: string | null;
  onCopyShareUrl: () => void;
  onCopyEmbed: () => void;
  onCloseShareModal: () => void;
}

/**
 * Container for all playground modals
 */
export function PlaygroundModals({
  showSettings,
  onCloseSettings,
  onSaveSettings,
  editorSettings,
  themeSettings,
  showAuthModal,
  onCloseAuthModal,
  showShortcutsHelp,
  onCloseShortcutsHelp,
  showHistory,
  onCloseHistory,
  onLoadHistory,
  languages,
  showTemplateGallery,
  onCloseTemplateGallery,
  selectedLanguage,
  onSelectTemplate,
  showSnippetLibrary,
  onCloseSnippetLibrary,
  onSelectSnippet,
  shareUrl,
  shareId,
  onCopyShareUrl,
  onCopyEmbed,
  onCloseShareModal,
}: PlaygroundModalsProps) {
  return (
    <>
      {/* Share Modal */}
      {shareUrl && shareId && (
        <ShareModal
          shareUrl={shareUrl}
          shareId={shareId}
          onCopy={onCopyShareUrl}
          onCopyEmbed={onCopyEmbed}
          onClose={onCloseShareModal}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={onCloseSettings}
        onSave={onSaveSettings}
        initialEditor={editorSettings}
        initialTheme={themeSettings}
      />

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={onCloseAuthModal} />

      {/* Shortcuts Help Modal */}
      <ShortcutsHelp isOpen={showShortcutsHelp} onClose={onCloseShortcutsHelp} />

      {/* History Sidebar */}
      <HistorySidebar
        isOpen={showHistory}
        onClose={onCloseHistory}
        onLoadHistory={onLoadHistory}
        languages={languages}
      />

      {/* Template Gallery */}
      <TemplateGallery
        isOpen={showTemplateGallery}
        onClose={onCloseTemplateGallery}
        selectedLanguage={selectedLanguage}
        onSelectTemplate={onSelectTemplate}
      />

      {/* Snippet Library */}
      <SnippetLibrary
        isOpen={showSnippetLibrary}
        onClose={onCloseSnippetLibrary}
        onSelectSnippet={onSelectSnippet}
        currentLanguage={selectedLanguage}
      />
    </>
  );
}
