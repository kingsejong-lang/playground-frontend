'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import dynamicImport from 'next/dynamic';
import LanguageToggle from '@/components/LanguageToggle';
import LanguageSelector from '@/components/LanguageSelector';
import OutputPanel from '@/components/OutputPanel';
import FileTabs from '@/components/FileTabs';

// Dynamic imports for heavy components
const CodeEditor = dynamicImport(() => import('@/components/CodeEditor'), {
  loading: () => (
    <div className="h-full flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Loading editor...</p>
      </div>
    </div>
  ),
  ssr: false,
});

const SettingsModal = dynamicImport(() => import('@/components/SettingsModal'));
const AuthModal = dynamicImport(() => import('@/components/AuthModal'));
const HistorySidebar = dynamicImport(() => import('@/components/HistorySidebar'));
const FileTree = dynamicImport(() => import('@/components/FileTree'));
const ShortcutsHelp = dynamicImport(() => import('@/components/ShortcutsHelp').then(mod => ({ default: mod.ShortcutsHelp })));
import { useAuth } from '@/contexts/AuthContext';
import { useLanguages } from '@/hooks/useLanguages';
import { useCodeExecution } from '@/hooks/useCodeExecution';
import { useShare } from '@/hooks/useShare';
import { useSettings } from '@/hooks/useSettings';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { useHistory } from '@/hooks/useHistory';
import { useFiles } from '@/hooks/useFiles';
import { HistoryItem } from '@/lib/history';
import { useToast } from '@/hooks/useToast';

// Force dynamic rendering for URL search params
export const dynamic = 'force-dynamic';

function PlaygroundContent() {
  const searchParams = useSearchParams();
  const { user, isAuthenticated, logout } = useAuth();
  const toast = useToast();
  const t = useTranslations();

  // Custom hooks
  const {
    languages,
    selectedLanguage,
    loading: loadingLanguages,
    error: languageError,
    setSelectedLanguage,
    changeLanguage,
  } = useLanguages();

  // Multi-file support
  const {
    files,
    activeFileId,
    activeFile,
    addFile,
    deleteFile,
    renameFile,
    updateFileContent,
    setActiveFile,
    getFilesObject,
    loadFiles,
  } = useFiles('main.ks', '');

  const {
    output,
    loading: executing,
    streaming,
    streamEvents,
    error: executionError,
    wsConnected,
    wsConnecting,
    wsReconnecting,
    execute,
    executeStream,
    executeWebSocket,
    reset: resetExecution,
  } = useCodeExecution();

  const {
    shareUrl,
    sharing,
    error: shareError,
    createShare,
    loadShared,
    copyToClipboard,
    closeShareModal,
  } = useShare();

  const {
    editorSettings,
    themeSettings,
    error: settingsError,
    saveSettings,
  } = useSettings(isAuthenticated);

  // Local UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showFileTree, setShowFileTree] = useState(false);

  // History hook
  const history = useHistory();

  // Combined error
  const error = languageError || executionError || shareError || settingsError;

  // Load history item
  const handleLoadHistory = (item: HistoryItem) => {
    // For now, load as a single file (history doesn't support multi-file yet)
    if (activeFile) {
      updateFileContent(activeFile.id, item.code);
    }
    setSelectedLanguage(item.language);
  };

  // Handle adding new file
  const handleAddFile = () => {
    const fileNumber = files.length + 1;
    const newFileName = `file${fileNumber}.ks`;
    addFile(newFileName, '');
    toast.success(`Created ${newFileName}`);
  };

  // Handle content change in editor
  const handleContentChange = (newContent: string) => {
    if (activeFile) {
      updateFileContent(activeFile.id, newContent);
    }
  };

  // Get current code (for execution and sharing)
  const getCurrentCode = (): string => {
    return activeFile?.content || '';
  };

  // Save to history when execution completes
  useEffect(() => {
    if (output && !executing && !streaming) {
      history.addItem({
        language: selectedLanguage,
        code: getCurrentCode(),
        output,
        success: output.success,
      });
    }
  }, [output, executing, streaming]);

  // Keyboard shortcuts
  useKeyboardShortcut('Enter', () => executeStream(getCurrentCode(), selectedLanguage, languages), {
    ctrl: true,
    enabled: !executing && !streaming,
  });

  useKeyboardShortcut('k', resetExecution, {
    ctrl: true,
  });

  useKeyboardShortcut(',', () => setShowSettings(true), {
    ctrl: true,
  });

  useKeyboardShortcut('h', () => setShowHistory(prev => !prev), {
    ctrl: true,
  });

  useKeyboardShortcut('?', () => setShowShortcutsHelp(prev => !prev));

  // Load shared code from URL params
  useEffect(() => {
    const shareId = searchParams.get('share');
    if (shareId) {
      loadShared(shareId, (language, sharedCode) => {
        setSelectedLanguage(language);
        // Load shared code into active file
        if (activeFile) {
          updateFileContent(activeFile.id, sharedCode);
        }
        resetExecution();
      });
    }
  }, [searchParams]);

  // Loading state
  if (loadingLanguages) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {/* Skip to main content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg"
      >
        Skip to main content
      </a>

      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{t('app.title')}</h1>
            <p className="text-sm text-gray-400 mt-1">{t('app.description')}</p>
          </div>
          <div className="flex items-center gap-4">
            <LanguageToggle />
            <LanguageSelector
              languages={languages}
              selectedLanguage={selectedLanguage}
              onSelect={changeLanguage}
            />
            <button
              onClick={() => setShowFileTree(prev => !prev)}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
              aria-label={showFileTree ? "Close file tree" : "Open file tree"}
            >
              📁 Files
            </button>
            <button
              onClick={() => createShare(getCurrentCode(), selectedLanguage, languages)}
              disabled={sharing}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
              aria-label="Share code"
              aria-busy={sharing}
            >
              {sharing ? 'Sharing...' : '🔗 Share'}
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
              aria-label="Open settings"
            >
              ⚙️ Settings
            </button>
            <button
              onClick={() => setShowHistory(true)}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
              aria-label="Open execution history"
            >
              📜 History
            </button>

            {/* Auth buttons */}
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400">
                  {user?.name || user?.email}
                </span>
                <button
                  onClick={logout}
                  className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
                  aria-label="Logout from account"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                aria-label="Open login modal"
              >
                Login
              </button>
            )}

            <button
              onClick={() => executeStream(getCurrentCode(), selectedLanguage, languages)}
              disabled={executing || streaming}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
              aria-label="Run code"
              aria-busy={executing || streaming}
            >
              {executing || streaming ? 'Running...' : '▶ Run'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div id="main-content" className="flex-1 flex overflow-hidden">
        {/* File Tree Sidebar */}
        {showFileTree && (
          <FileTree
            isOpen={showFileTree}
            onClose={() => setShowFileTree(false)}
            files={files}
            activeFileId={activeFileId}
            onSelectFile={setActiveFile}
            onAddFile={handleAddFile}
            onRenameFile={renameFile}
            onDeleteFile={deleteFile}
          />
        )}

        {/* Editor Panel */}
        <div className="w-1/2 border-r border-gray-800">
          <div className="h-full flex flex-col">
            {/* File Tabs */}
            <FileTabs
              files={files}
              activeFileId={activeFileId}
              onSelectFile={setActiveFile}
              onCloseFile={deleteFile}
              onRenameFile={renameFile}
              onAddFile={handleAddFile}
            />

            <div className="flex-1">
              <CodeEditor
                value={activeFile?.content || ''}
                onChange={handleContentChange}
                language={selectedLanguage}
                fontSize={editorSettings.font_size}
                fontFamily={editorSettings.font_family}
                tabSize={editorSettings.tab_size}
                minimap={editorSettings.minimap}
                theme={themeSettings.color_scheme}
              />
            </div>
          </div>
        </div>

        {/* Output Panel */}
        <div className="w-1/2">
          <div className="h-full flex flex-col">
            <div className="bg-gray-900 px-4 py-2 border-b border-gray-800">
              <h2 className="text-sm font-medium text-gray-300">Output</h2>
            </div>
            <div className="flex-1">
              <OutputPanel
                output={output}
                loading={executing}
                error={error}
                streaming={streaming}
                streamEvents={streamEvents}
                onClear={resetExecution}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Share URL Modal */}
      {shareUrl && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          role="dialog"
          aria-labelledby="share-modal-title"
          aria-modal="true"
        >
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 id="share-modal-title" className="text-lg font-bold text-white mb-4">Share Your Code</h3>
            <p className="text-sm text-gray-400 mb-4">
              Your code has been shared! The URL has been copied to clipboard.
            </p>
            <div className="bg-gray-800 border border-gray-700 rounded p-3 mb-4">
              <code className="text-sm text-blue-400 break-all">{shareUrl}</code>
            </div>
            <div className="flex gap-3">
              <button
                onClick={copyToClipboard}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                aria-label="Copy share URL to clipboard again"
              >
                Copy Again
              </button>
              <button
                onClick={closeShareModal}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
                aria-label="Close share modal"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={saveSettings}
        initialEditor={editorSettings}
        initialTheme={themeSettings}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      {/* Shortcuts Help Modal */}
      <ShortcutsHelp
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />

      {/* History Sidebar */}
      <HistorySidebar
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onLoadHistory={handleLoadHistory}
        languages={languages}
      />
    </div>
  );
}

export default function PlaygroundPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-gray-950 text-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading...</p>
          </div>
        </div>
      }
    >
      <PlaygroundContent />
    </Suspense>
  );
}
