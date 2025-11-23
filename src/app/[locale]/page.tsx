'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import dynamicImport from 'next/dynamic';
import { Play, Settings, Share2, History, FileText, Moon, Sun, Layout } from 'lucide-react';
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
const TemplateGallery = dynamicImport(() => import('@/components/TemplateGallery').then(mod => ({ default: mod.TemplateGallery })));
const SnippetLibrary = dynamicImport(() => import('@/components/SnippetLibrary'));
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
import { languagesAPI } from '@/lib/api';
import { useTheme } from '@/hooks/useTheme';
import { useLayout } from '@/hooks/useLayout';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

// Force dynamic rendering for URL search params
export const dynamic = 'force-dynamic';

function PlaygroundContent() {
  const searchParams = useSearchParams();
  const { user, isAuthenticated, logout } = useAuth();
  const toast = useToast();
  const t = useTranslations();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { orientation, toggleOrientation } = useLayout();

  // Custom hooks
  const {
    languages,
    selectedLanguage,
    code: defaultCode,
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
  } = useFiles('main.ksj', '');

  const {
    editorSettings,
    themeSettings,
    error: settingsError,
    saveSettings,
  } = useSettings(isAuthenticated);

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
  } = useCodeExecution({
    enableWebSocket: editorSettings.execution_mode === 'websocket',
  });

  const {
    shareUrl,
    shareId,
    sharing,
    error: shareError,
    createShare,
    loadShared,
    copyToClipboard,
    closeShareModal,
  } = useShare();

  // Local UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showFileTree, setShowFileTree] = useState(false);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [showSnippetLibrary, setShowSnippetLibrary] = useState(false);

  // History hook
  const history = useHistory();

  // Combined error
  const error = languageError || executionError || shareError || settingsError;

  // Track initial code setup per file and language
  const initializedRef = useRef<Set<string>>(new Set());

  // Set initial code when language loads or changes
  useEffect(() => {
    if (!defaultCode || !activeFileId) return;

    // Create a unique key for this file + language combination
    const key = `${activeFileId}_${selectedLanguage}`;

    // Skip if already initialized for this combination
    if (initializedRef.current.has(key)) return;

    const currentFile = files.find(f => f.id === activeFileId);
    if (currentFile) {
      const isEmpty = !currentFile.content || currentFile.content.trim() === '';
      if (isEmpty) {
        updateFileContent(activeFileId, defaultCode);
        initializedRef.current.add(key);
      }
    }
  }, [defaultCode, activeFileId, selectedLanguage, files, updateFileContent]);

  // Clear initialization tracking when language changes
  useEffect(() => {
    initializedRef.current.clear();
  }, [selectedLanguage]);

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
    const newFileName = `file${fileNumber}.ksj`;
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

  // Helper to execute code based on execution mode setting
  const handleExecuteCode = useCallback(() => {
    const code = activeFile?.content || '';
    const mode = editorSettings.execution_mode || 'http';

    if (mode === 'websocket') {
      executeWebSocket(code, selectedLanguage, languages);
    } else {
      // Default to HTTP
      execute(code, selectedLanguage, languages);
    }
  }, [activeFile?.content, editorSettings.execution_mode, selectedLanguage, languages, execute, executeWebSocket]);

  // Helper to format code
  const handleFormatCode = useCallback(async () => {
    if (!activeFile?.content) return;

    try {
      const formattedCode = await languagesAPI.formatCode(selectedLanguage, activeFile.content);
      updateFileContent(activeFile.id, formattedCode);
      toast.success('Code formatted successfully');
    } catch (error) {
      console.error('Failed to format code:', error);
      toast.error('Failed to format code');
    }
  }, [activeFile, selectedLanguage, updateFileContent, toast]);

  // Helper to load template
  const handleSelectTemplate = useCallback((code: string) => {
    if (activeFile) {
      updateFileContent(activeFile.id, code);
      toast.success('Template loaded successfully');
    }
  }, [activeFile, updateFileContent, toast]);

  // Keyboard shortcuts
  useKeyboardShortcut('Enter', handleExecuteCode, {
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

  useKeyboardShortcut('s', () => createShare(getCurrentCode(), selectedLanguage, languages), {
    ctrl: true,
    enabled: !sharing,
  });

  useKeyboardShortcut('t', () => setShowTemplateGallery(prev => !prev), {
    ctrl: true,
  });

  useKeyboardShortcut('l', () => setShowSnippetLibrary(prev => !prev), {
    ctrl: true,
  });

  useKeyboardShortcut('f', () => setShowFileTree(prev => !prev), {
    ctrl: true,
  });

  useKeyboardShortcut('f', handleFormatCode, {
    ctrl: true,
    shift: true,
    enabled: !!activeFile?.content,
  });

  useKeyboardShortcut('/', toggleTheme, {
    ctrl: true,
  });

  useKeyboardShortcut('b', toggleOrientation, {
    ctrl: true,
  });

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
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-void)' }}>
      {/* Skip to main content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg"
      >
        Skip to main content
      </a>

      {/* Header - Control Sanctum */}
      <header className="px-6 py-4" style={{ backgroundColor: 'var(--editor-zone)', borderBottom: '1px solid var(--border-hair)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-light tracking-wide" style={{ color: 'var(--text-primary)' }}>
              {t('app.title')}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-whisper)' }}>
              {t('app.description')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector
              languages={languages}
              selectedLanguage={selectedLanguage}
              onSelect={changeLanguage}
            />

            {/* Secondary Actions - Neutral Gray */}
            <button
              onClick={() => setShowTemplateGallery(true)}
              className="h-10 px-4 text-xs transition-colors rounded"
              style={{
                color: 'var(--text-whisper)',
                backgroundColor: 'transparent',
                border: 'none'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--border-hair)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              aria-label="Open template gallery"
            >
              <FileText className="w-4 h-4 mr-2 inline" />
              Templates
            </button>
            <button
              onClick={() => setShowHistory(true)}
              className="h-10 px-4 text-xs transition-colors rounded"
              style={{
                color: 'var(--text-whisper)',
                backgroundColor: 'transparent',
                border: 'none'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--border-hair)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              aria-label="Open execution history"
            >
              <History className="w-4 h-4 mr-2 inline" />
              History
            </button>
            <button
              onClick={() => createShare(getCurrentCode(), selectedLanguage, languages)}
              disabled={sharing}
              className="h-10 px-4 text-xs transition-colors rounded disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                color: 'var(--text-whisper)',
                backgroundColor: 'transparent',
                border: 'none'
              }}
              onMouseEnter={(e) => !sharing && (e.currentTarget.style.backgroundColor = 'var(--border-hair)')}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              aria-label="Share code"
              aria-busy={sharing}
            >
              <Share2 className="w-4 h-4 mr-2 inline" />
              {sharing ? 'Sharing...' : 'Share'}
            </button>

            <div className="h-6" style={{ width: '1px', backgroundColor: 'var(--border-hair)' }} />

            <button
              onClick={toggleOrientation}
              className="h-10 px-3 text-xs transition-colors rounded"
              style={{
                color: 'var(--text-whisper)',
                backgroundColor: 'transparent',
                border: 'none'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--border-hair)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              aria-label={`Switch to ${orientation === 'horizontal' ? 'vertical' : 'horizontal'} layout`}
            >
              <Layout className="w-4 h-4" />
            </button>
            <button
              onClick={toggleTheme}
              className="h-10 px-3 text-xs transition-colors rounded"
              style={{
                color: 'var(--text-whisper)',
                backgroundColor: 'transparent',
                border: 'none'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--border-hair)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
            >
              {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="h-10 px-3 text-xs transition-colors rounded"
              style={{
                color: 'var(--text-whisper)',
                backgroundColor: 'transparent',
                border: 'none'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--border-hair)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              aria-label="Open settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            <div className="h-6" style={{ width: '1px', backgroundColor: 'var(--border-hair)' }} />

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

            {/* Primary Action - Commanding Blue */}
            <button
              onClick={handleExecuteCode}
              disabled={executing || streaming}
              className="h-10 px-6 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded"
              style={{
                backgroundColor: 'var(--accent-indigo)',
                color: '#ffffff',
                border: 'none'
              }}
              onMouseEnter={(e) => !executing && !streaming && (e.currentTarget.style.backgroundColor = '#3d4daa')}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-indigo)'}
              aria-label="Run code"
              aria-busy={executing || streaming}
            >
              <Play className="w-4 h-4 mr-2 inline" />
              {executing || streaming ? 'Running...' : 'Run'}
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

        {/* Resizable Panels */}
        <PanelGroup direction={orientation} className="flex-1">
          {/* Editor Panel - Editor Sanctuary */}
          <Panel defaultSize={50} minSize={20}>
            <div className="h-full flex flex-col" style={{ borderRight: '1px solid var(--border-hair)', backgroundColor: 'var(--editor-zone)' }}>
              {/* File Tabs */}
              <FileTabs
                files={files}
                activeFileId={activeFileId}
                onSelectFile={setActiveFile}
                onCloseFile={deleteFile}
                onRenameFile={renameFile}
                onAddFile={handleAddFile}
              />

              <div className="flex-1 min-h-0">
                <CodeEditor
                  value={activeFile?.content || ''}
                  onChange={handleContentChange}
                  language={selectedLanguage}
                  readOnly={false}
                  fontSize={editorSettings.font_size}
                  fontFamily={editorSettings.font_family}
                  tabSize={editorSettings.tab_size}
                  minimap={editorSettings.minimap}
                  theme={resolvedTheme === 'dark' ? 'code-sanctuary-dark' : 'code-sanctuary-light'}
                  onFormat={handleFormatCode}
                />
              </div>
            </div>
          </Panel>

          {/* Resize Handle - Material Honesty: Hairline Divider */}
          <PanelResizeHandle
            className="w-px cursor-col-resize data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:cursor-row-resize"
            style={{ backgroundColor: 'var(--border-hair)' }}
          />

          {/* Output Panel - Output Gallery */}
          <Panel defaultSize={50} minSize={20}>
            <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--output-zone)' }}>
              <div className="px-6 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-hair)' }}>
                <h2 className="text-xs font-light tracking-wide" style={{ color: 'var(--text-whisper)' }}>
                  OUTPUT
                </h2>
              </div>
              <div className="flex-1 min-h-0">
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
          </Panel>
        </PanelGroup>
      </div>

      {/* Share URL Modal */}
      {shareUrl && shareId && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          role="dialog"
          aria-labelledby="share-modal-title"
          aria-modal="true"
        >
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 id="share-modal-title" className="text-lg font-bold text-white mb-4">Share Your Code</h3>
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
                onClick={copyToClipboard}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                aria-label="Copy share URL to clipboard"
              >
                📋 Copy Share URL
              </button>
            </div>

            {/* Embed Code */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Embed Code (iframe)
              </label>
              <div className="bg-gray-800 border border-gray-700 rounded p-3 mb-2 overflow-x-auto">
                <code className="text-xs text-green-400">
                  {`<iframe src="${window.location.origin}/embed/${shareId}" width="100%" height="600" frameborder="0"></iframe>`}
                </code>
              </div>
              <button
                onClick={async () => {
                  const embedCode = `<iframe src="${window.location.origin}/embed/${shareId}" width="100%" height="600" frameborder="0"></iframe>`;
                  try {
                    await navigator.clipboard.writeText(embedCode);
                    toast.success('Embed code copied to clipboard!');
                  } catch (err) {
                    console.error('Failed to copy:', err);
                    toast.error('Failed to copy to clipboard');
                  }
                }}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                aria-label="Copy embed code to clipboard"
              >
                📦 Copy Embed Code
              </button>
            </div>

            <div className="flex gap-3">
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

      {/* Template Gallery */}
      <TemplateGallery
        isOpen={showTemplateGallery}
        onClose={() => setShowTemplateGallery(false)}
        selectedLanguage={selectedLanguage}
        onSelectTemplate={handleSelectTemplate}
      />

      {/* Snippet Library */}
      <SnippetLibrary
        isOpen={showSnippetLibrary}
        onClose={() => setShowSnippetLibrary(false)}
        onSelectSnippet={(code) => {
          if (activeFile) {
            updateFileContent(activeFile.id, code);
            toast.success('Snippet loaded successfully');
          }
        }}
        currentLanguage={selectedLanguage}
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
