'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamicImport from 'next/dynamic';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

// Components
import OutputPanel from '@/components/OutputPanel';
import FileTabs from '@/components/FileTabs';
import { PlaygroundHeader } from './components/PlaygroundHeader';
import { PlaygroundModals } from './components/PlaygroundModals';

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
const FileTree = dynamicImport(() => import('@/components/FileTree'));

// Hooks & Context
import { useAuth } from '@/contexts/AuthContext';
import { useLanguages } from '@/hooks/useLanguages';
import { useCodeExecution } from '@/hooks/useCodeExecution';
import { useShare } from '@/hooks/useShare';
import { useSettings } from '@/hooks/useSettings';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { useHistory } from '@/hooks/useHistory';
import { useFiles } from '@/hooks/useFiles';
import { useToast } from '@/hooks/useToast';
import { useTheme } from '@/hooks/useTheme';
import { useLayout } from '@/hooks/useLayout';
import { HistoryItem } from '@/lib/history';
import { languagesAPI } from '@/lib/api';

export const dynamic = 'force-dynamic';

function PlaygroundContent() {
  const searchParams = useSearchParams();
  const { user, isAuthenticated, logout } = useAuth();
  const toast = useToast();
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

  const {
    files,
    activeFileId,
    activeFile,
    addFile,
    deleteFile,
    renameFile,
    updateFileContent,
    setActiveFile,
  } = useFiles('main.ksj', '');

  const { editorSettings, themeSettings, error: settingsError, saveSettings } = useSettings(isAuthenticated);

  const {
    output,
    loading: executing,
    streaming,
    streamEvents,
    error: executionError,
    execute,
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

  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showFileTree, setShowFileTree] = useState(false);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [showSnippetLibrary, setShowSnippetLibrary] = useState(false);

  const history = useHistory();
  const error = languageError || executionError || shareError || settingsError;
  const initializedRef = useRef<Set<string>>(new Set());

  // Set initial code when language loads
  useEffect(() => {
    if (!defaultCode || !activeFileId) return;
    const key = `${activeFileId}_${selectedLanguage}`;
    if (initializedRef.current.has(key)) return;

    const currentFile = files.find((f) => f.id === activeFileId);
    if (currentFile && (!currentFile.content || currentFile.content.trim() === '')) {
      updateFileContent(activeFileId, defaultCode);
      initializedRef.current.add(key);
    }
  }, [defaultCode, activeFileId, selectedLanguage, files, updateFileContent]);

  useEffect(() => {
    initializedRef.current.clear();
  }, [selectedLanguage]);

  // Handlers
  const getCurrentCode = useCallback(() => activeFile?.content || '', [activeFile]);

  const handleExecuteCode = useCallback(() => {
    const code = getCurrentCode();
    const mode = editorSettings.execution_mode || 'http';
    if (mode === 'websocket') {
      executeWebSocket(code, selectedLanguage, languages);
    } else {
      execute(code, selectedLanguage, languages);
    }
  }, [getCurrentCode, editorSettings.execution_mode, selectedLanguage, languages, execute, executeWebSocket]);

  const handleFormatCode = useCallback(async () => {
    if (!activeFile?.content) return;
    try {
      const formattedCode = await languagesAPI.formatCode(selectedLanguage, activeFile.content);
      updateFileContent(activeFile.id, formattedCode);
      toast.success('Code formatted successfully');
    } catch {
      toast.error('Failed to format code');
    }
  }, [activeFile, selectedLanguage, updateFileContent, toast]);

  const handleShare = useCallback(() => {
    createShare(getCurrentCode(), selectedLanguage, languages);
  }, [createShare, getCurrentCode, selectedLanguage, languages]);

  const handleCopyEmbed = useCallback(async () => {
    if (!shareId) return;
    const embedCode = `<iframe src="${window.location.origin}/embed/${shareId}" width="100%" height="600" frameborder="0"></iframe>`;
    try {
      await navigator.clipboard.writeText(embedCode);
      toast.success('Embed code copied to clipboard!');
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  }, [shareId, toast]);

  const handleSelectTemplate = useCallback(
    (code: string) => {
      if (activeFile) {
        updateFileContent(activeFile.id, code);
        toast.success('Template loaded successfully');
      }
    },
    [activeFile, updateFileContent, toast]
  );

  const handleSelectSnippet = useCallback(
    (code: string) => {
      if (activeFile) {
        updateFileContent(activeFile.id, code);
        toast.success('Snippet loaded successfully');
      }
    },
    [activeFile, updateFileContent, toast]
  );

  const handleLoadHistory = useCallback(
    (item: HistoryItem) => {
      if (activeFile) {
        updateFileContent(activeFile.id, item.code);
      }
      setSelectedLanguage(item.language);
    },
    [activeFile, updateFileContent, setSelectedLanguage]
  );

  const handleAddFile = useCallback(() => {
    const fileNumber = files.length + 1;
    const newFileName = `file${fileNumber}.ksj`;
    addFile(newFileName, '');
    toast.success(`Created ${newFileName}`);
  }, [files.length, addFile, toast]);

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

  // Load shared code from URL
  useEffect(() => {
    const shareIdParam = searchParams.get('share');
    if (shareIdParam) {
      loadShared(shareIdParam, (language, sharedCode) => {
        setSelectedLanguage(language);
        if (activeFile) {
          updateFileContent(activeFile.id, sharedCode);
        }
        resetExecution();
      });
    }
  }, [searchParams]);

  // Keyboard shortcuts
  useKeyboardShortcut('Enter', handleExecuteCode, { ctrl: true, enabled: !executing && !streaming });
  useKeyboardShortcut('k', resetExecution, { ctrl: true });
  useKeyboardShortcut(',', () => setShowSettings(true), { ctrl: true });
  useKeyboardShortcut('h', () => setShowHistory((prev) => !prev), { ctrl: true });
  useKeyboardShortcut('?', () => setShowShortcutsHelp((prev) => !prev));
  useKeyboardShortcut('s', handleShare, { ctrl: true, enabled: !sharing });
  useKeyboardShortcut('t', () => setShowTemplateGallery((prev) => !prev), { ctrl: true });
  useKeyboardShortcut('l', () => setShowSnippetLibrary((prev) => !prev), { ctrl: true });
  useKeyboardShortcut('f', () => setShowFileTree((prev) => !prev), { ctrl: true });
  useKeyboardShortcut('f', handleFormatCode, { ctrl: true, shift: true, enabled: !!activeFile?.content });
  useKeyboardShortcut('/', toggleTheme, { ctrl: true });
  useKeyboardShortcut('b', toggleOrientation, { ctrl: true });

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
      {/* Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg"
      >
        Skip to main content
      </a>

      {/* Header */}
      <PlaygroundHeader
        languages={languages}
        selectedLanguage={selectedLanguage}
        onLanguageChange={changeLanguage}
        user={user}
        isAuthenticated={isAuthenticated}
        onLogout={logout}
        onOpenAuth={() => setShowAuthModal(true)}
        resolvedTheme={resolvedTheme}
        onToggleTheme={toggleTheme}
        orientation={orientation}
        onToggleOrientation={toggleOrientation}
        onOpenTemplates={() => setShowTemplateGallery(true)}
        onOpenHistory={() => setShowHistory(true)}
        onShare={handleShare}
        sharing={sharing}
        onOpenSettings={() => setShowSettings(true)}
        onExecute={handleExecuteCode}
        executing={executing}
        streaming={streaming}
      />

      {/* Main Content */}
      <div id="main-content" className="flex-1 flex overflow-hidden">
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

        <PanelGroup direction={orientation} className="flex-1">
          {/* Editor Panel */}
          <Panel defaultSize={50} minSize={20}>
            <div
              className="h-full flex flex-col"
              style={{ borderRight: '1px solid var(--border-hair)', backgroundColor: 'var(--editor-zone)' }}
            >
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
                  onChange={(content) => activeFile && updateFileContent(activeFile.id, content)}
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

          {/* Resize Handle */}
          <PanelResizeHandle
            className="w-px cursor-col-resize data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:cursor-row-resize"
            style={{ backgroundColor: 'var(--border-hair)' }}
          />

          {/* Output Panel */}
          <Panel defaultSize={50} minSize={20}>
            <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--output-zone)' }}>
              <div
                className="px-6 py-3 flex items-center justify-between"
                style={{ borderBottom: '1px solid var(--border-hair)' }}
              >
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

      {/* Modals */}
      <PlaygroundModals
        showSettings={showSettings}
        onCloseSettings={() => setShowSettings(false)}
        onSaveSettings={saveSettings}
        editorSettings={editorSettings}
        themeSettings={themeSettings}
        showAuthModal={showAuthModal}
        onCloseAuthModal={() => setShowAuthModal(false)}
        showShortcutsHelp={showShortcutsHelp}
        onCloseShortcutsHelp={() => setShowShortcutsHelp(false)}
        showHistory={showHistory}
        onCloseHistory={() => setShowHistory(false)}
        onLoadHistory={handleLoadHistory}
        languages={languages}
        showTemplateGallery={showTemplateGallery}
        onCloseTemplateGallery={() => setShowTemplateGallery(false)}
        selectedLanguage={selectedLanguage}
        onSelectTemplate={handleSelectTemplate}
        showSnippetLibrary={showSnippetLibrary}
        onCloseSnippetLibrary={() => setShowSnippetLibrary(false)}
        onSelectSnippet={handleSelectSnippet}
        shareUrl={shareUrl}
        shareId={shareId}
        onCopyShareUrl={copyToClipboard}
        onCopyEmbed={handleCopyEmbed}
        onCloseShareModal={closeShareModal}
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
