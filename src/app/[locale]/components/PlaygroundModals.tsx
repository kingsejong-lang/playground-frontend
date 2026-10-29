/**
 * Playground modals container component
 */

'use client';

import dynamicImport from 'next/dynamic';
import type { Language } from '@kingsejong-lang/playground-proto';
import type { EditorSettings, ThemeSettings } from '@/features/settings/useSettings';
import { ShareModal } from '@/features/share/ShareModal';
import { HistoryItem } from '@/features/execution/history';

// Dynamic imports for modals
const SettingsModal = dynamicImport(() => import('@/features/settings/SettingsModal'));
const AuthModal = dynamicImport(() => import('@/features/auth/AuthModal'));
const HistorySidebar = dynamicImport(() => import('@/features/execution/HistorySidebar'));
const ShortcutsHelp = dynamicImport(() =>
  import('@/components/ShortcutsHelp').then((mod) => ({ default: mod.ShortcutsHelp }))
);
const TemplateGallery = dynamicImport(() =>
  import('@/features/editor/TemplateGallery').then((mod) => ({ default: mod.TemplateGallery }))
);
const SnippetLibrary = dynamicImport(() => import('@/features/editor/SnippetLibrary'));

interface PlaygroundModalsProps {
  // Settings
  showSettings: boolean;
  onCloseSettings: () => void;
  onSaveSettings: (editor: EditorSettings, theme: ThemeSettings) => void;
  editorSettings: EditorSettings;
  themeSettings: ThemeSettings;
  isAuthenticated: boolean;
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
  embedCode: string;
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
  isAuthenticated,
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
  embedCode,
  onCopyShareUrl,
  onCopyEmbed,
  onCloseShareModal,
}: PlaygroundModalsProps) {
  return (
    <>
      {/* Share Modal */}
      {shareUrl && (
        <ShareModal
          shareUrl={shareUrl}
          embedCode={embedCode}
          onCopy={onCopyShareUrl}
          onCopyEmbed={onCopyEmbed}
          onClose={onCloseShareModal}
        />
      )}

      {/* Settings Modal */}
      {/* Remounted on every open so the form starts from the current settings, without a stale first frame. */}
      <SettingsModal
        key={showSettings ? 'settings-open' : 'settings-closed'}
        isOpen={showSettings}
        onClose={onCloseSettings}
        onSave={onSaveSettings}
        initialEditor={editorSettings}
        initialTheme={themeSettings}
        isAuthenticated={isAuthenticated}
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
