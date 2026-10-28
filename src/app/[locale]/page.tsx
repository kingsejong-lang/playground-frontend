'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamicImport from 'next/dynamic';
import { useLocale, useTranslations } from 'next-intl';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

// Components
import OutputPanel from '@/features/execution/OutputPanel';
import FileTabs from '@/features/editor/FileTabs';
import { EditorSkeleton, type RevealRequest } from '@/features/editor/CodeEditor';
import { PlaygroundHeader } from './components/PlaygroundHeader';
import { PlaygroundModals } from './components/PlaygroundModals';
import { useModifierKey } from '@/components/ui/Kbd';

// Dynamic imports for heavy components
const CodeEditor = dynamicImport(() => import('@/features/editor/CodeEditor'), {
  loading: () => <EditorSkeleton />,
  ssr: false,
});
const FileTree = dynamicImport(() => import('@/features/editor/FileTree'));

// Hooks & Context
import { useAuth } from '@/features/auth/AuthContext';
import { useLanguages } from '@/features/editor/useLanguages';
import { useCodeExecution } from '@/features/execution/useCodeExecution';
import { useShare } from '@/features/share/useShare';
import { normalizeColorScheme, useSettings, type EditorSettings, type ThemeSettings } from '@/features/settings/useSettings';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { useHistory } from '@/features/execution/useHistory';
import { useFiles } from '@/features/editor/useFiles';
import { useToast } from '@/hooks/useToast';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useTheme } from '@/features/settings/useTheme';
import { useLayout } from '@/features/settings/useLayout';
import type { HistoryItem } from '@/features/execution/history';
import type { DiagnosticView } from '@/lib/rpc';
import { useFormatCode } from '@/features/editor/useFormatCode';

function PlaygroundContent() {
  const searchParams = useSearchParams();
  const t = useTranslations();
  const locale = useLocale();
  const { user, isAuthenticated, logout } = useAuth();
  const toast = useToast();
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const { orientation, toggleOrientation } = useLayout();
  const narrow = useMediaQuery('(max-width: 767px)');
  const mod = useModifierKey();
  const runKeys = [mod, 'Enter'];

  const {
    languages,
    selectedLanguage,
    code: defaultCode,
    loading: loadingLanguages,
    error: languageError,
    errorKind: languageErrorKind,
    setSelectedLanguage,
    changeLanguage,
    retry: retryLanguages,
    retrying: retryingLanguages,
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
    error: executionError,
    errorKind: executionErrorKind,
    retryAfterSeconds,
    execute,
    cancel: cancelExecution,
    reset: resetExecution,
  } = useCodeExecution();
  const formatCode = useFormatCode();

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
  const [reveal, setReveal] = useState<RevealRequest | null>(null);
  /** File that produced the current output; its diagnostics are drawn in the editor. */
  const [runFileId, setRunFileId] = useState<string | null>(null);

  const history = useHistory();
  // The backend-down state has its own banner; other language errors show as a request error.
  const backendDown = !!languageError && languageErrorKind === 'unavailable';
  // While the backend is known to be down, its banner already explains a failed run.
  const runError = backendDown && executionErrorKind === 'unavailable' ? null : executionError;
  const error = runError || shareError || settingsError || (backendDown ? null : languageError);
  const errorKind = runError ? executionErrorKind : languageError && !backendDown ? languageErrorKind : null;
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
    // With the backend known to be down, Run also tries to reconnect (the banner shows progress).
    if (languageError && languageErrorKind === 'unavailable') retryLanguages();
    setRunFileId(activeFile?.id ?? null);
    execute(getCurrentCode(), selectedLanguage, languages);
  }, [activeFile, getCurrentCode, selectedLanguage, languages, execute, languageError, languageErrorKind, retryLanguages]);

  const handleFormatCode = useCallback(async () => {
    if (!activeFile?.content) return;
    const result = await formatCode(selectedLanguage, activeFile.name, activeFile.content);
    if (result.ok) {
      updateFileContent(activeFile.id, result.content);
      toast.success(t('toast.formatted'));
    } else {
      toast.error(t('errors.format', { message: result.message }));
    }
  }, [activeFile, selectedLanguage, updateFileContent, toast, formatCode, t]);

  const handleShare = useCallback(() => {
    createShare(getCurrentCode(), selectedLanguage, languages);
  }, [createShare, getCurrentCode, selectedLanguage, languages]);

  const embedCode = shareId
    ? `<iframe src="${typeof window !== 'undefined' ? window.location.origin : ''}/${locale}/embed/${shareId}" width="100%" height="600" style="border:0" title="${t('app.title')}"></iframe>`
    : '';

  const handleCopyEmbed = useCallback(async () => {
    if (!embedCode) return;
    try {
      await navigator.clipboard.writeText(embedCode);
      toast.success(t('share.embedCopied'));
    } catch {
      toast.error(t('errors.clipboard'));
    }
  }, [embedCode, toast, t]);

  /** Replaces the active file's code and offers to undo it. */
  const replaceCode = useCallback(
    (nextCode: string, message: string) => {
      if (!activeFile) return;
      const fileId = activeFile.id;
      const previous = activeFile.content;
      updateFileContent(fileId, nextCode);
      const changed = previous.trim() !== '' && previous !== nextCode;
      toast.success(message, changed ? { action: { label: t('common.undo'), onClick: () => updateFileContent(fileId, previous) } } : undefined);
    },
    [activeFile, updateFileContent, toast, t]
  );

  const handleSelectTemplate = useCallback((code: string) => replaceCode(code, t('templates.loaded')), [replaceCode, t]);
  const handleSelectSnippet = useCallback((code: string) => replaceCode(code, t('snippets.loaded')), [replaceCode, t]);

  const handleLoadHistory = useCallback(
    (item: HistoryItem) => {
      replaceCode(item.code, t('history.loaded'));
      setSelectedLanguage(item.language);
    },
    [replaceCode, setSelectedLanguage, t]
  );

  const handleAddFile = useCallback(() => {
    const fileNumber = files.length + 1;
    const newFileName = `file${fileNumber}.ksj`;
    addFile(newFileName, '');
    toast.success(t('files.created', { name: newFileName }));
  }, [files.length, addFile, toast, t]);

  const handleJumpTo = useCallback(
    (d: DiagnosticView) => {
      const byName = files.find((f) => f.name === d.path);
      const target = byName?.id ?? runFileId ?? activeFileId;
      if (target && target !== activeFileId) setActiveFile(target);
      setReveal({ line: d.line, column: d.column, nonce: Date.now() });
    },
    [files, runFileId, activeFileId, setActiveFile]
  );

  const handleSaveSettings = useCallback(
    (editor: EditorSettings, nextTheme: ThemeSettings) => {
      void saveSettings(editor, nextTheme);
      setTheme(nextTheme.theme);
    },
    [saveSettings, setTheme]
  );

  // Save to history when execution completes (cancelled runs are not recorded)
  useEffect(() => {
    if (output && !executing && !streaming && output.status !== 'cancelled' && output.status !== 'pending') {
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
    return <AppShellSkeleton label={t('app.loading')} />;
  }

  const highContrast = normalizeColorScheme(themeSettings.color_scheme) === 'high-contrast';
  const editorTheme = highContrast
    ? resolvedTheme === 'dark'
      ? 'hc-black'
      : 'hc-light'
    : resolvedTheme === 'dark'
      ? 'code-sanctuary-dark'
      : 'code-sanctuary-light';
  const direction = narrow ? 'vertical' : orientation;
  const runDiagnostics = output && runFileId === activeFileId ? output.diagnostics : undefined;

  return (
    <div className="flex h-dvh flex-col bg-void">
      <a
        href="#code-editor"
        className="sr-only z-50 rounded-md bg-accent px-4 py-2 text-on-accent focus:not-sr-only focus:absolute focus:left-3 focus:top-3"
      >
        {t('app.skipToEditor')}
      </a>

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
        canChangeLayout={!narrow}
        onOpenTemplates={() => setShowTemplateGallery(true)}
        onOpenSnippets={() => setShowSnippetLibrary(true)}
        onOpenHistory={() => setShowHistory(true)}
        onToggleFileTree={() => setShowFileTree((prev) => !prev)}
        onFormat={handleFormatCode}
        onOpenShortcuts={() => setShowShortcutsHelp(true)}
        onShare={handleShare}
        sharing={sharing}
        onOpenSettings={() => setShowSettings(true)}
        onExecute={handleExecuteCode}
        executing={executing}
        streaming={streaming}
        onCancel={cancelExecution}
        runKeys={runKeys}
      />

      <main className="flex min-h-0 flex-1 overflow-hidden">
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

        <PanelGroup direction={direction} className="flex-1">
          <Panel defaultSize={narrow ? 55 : 50} minSize={20}>
            <section id="code-editor" tabIndex={-1} className="flex h-full flex-col bg-surface" aria-label={t('editor.label')}>
              <FileTabs
                files={files}
                activeFileId={activeFileId}
                onSelectFile={setActiveFile}
                onCloseFile={deleteFile}
                onRenameFile={renameFile}
                onAddFile={handleAddFile}
                onToggleFileTree={() => setShowFileTree((prev) => !prev)}
                fileTreeOpen={showFileTree}
              />
              <div className="min-h-0 flex-1">
                <CodeEditor
                  value={activeFile?.content || ''}
                  onChange={(content) => activeFile && updateFileContent(activeFile.id, content)}
                  language={selectedLanguage}
                  readOnly={false}
                  fontSize={editorSettings.font_size}
                  fontFamily={editorSettings.font_family}
                  tabSize={editorSettings.tab_size}
                  minimap={editorSettings.minimap && !narrow}
                  theme={editorTheme}
                  onFormat={handleFormatCode}
                  ariaLabel={`${t('editor.label')}: ${activeFile?.name ?? ''}`}
                  diagnostics={runDiagnostics}
                  reveal={reveal}
                />
              </div>
            </section>
          </Panel>

          <PanelResizeHandle aria-label={t('editor.resize')} className="group relative bg-hair outline-none data-[panel-group-direction=horizontal]:w-px data-[panel-group-direction=vertical]:h-px data-[resize-handle-state=drag]:bg-accent data-[resize-handle-state=hover]:bg-strong focus-visible:bg-accent">
            {/* Wider invisible hit area than the 1px rule. */}
            <span className="absolute group-data-[panel-group-direction=horizontal]:inset-y-0 group-data-[panel-group-direction=horizontal]:-inset-x-3 group-data-[panel-group-direction=vertical]:inset-x-0 group-data-[panel-group-direction=vertical]:-inset-y-3" />
          </PanelResizeHandle>

          <Panel defaultSize={narrow ? 45 : 50} minSize={20}>
            <OutputPanel
              output={output}
              loading={executing}
              error={error}
              errorKind={errorKind}
              retryAfterSeconds={runError ? retryAfterSeconds : null}
              streaming={streaming}
              onClear={resetExecution}
              onRetry={runError ? handleExecuteCode : languageError ? retryLanguages : undefined}
              onJumpTo={handleJumpTo}
              onOpenTemplates={() => setShowTemplateGallery(true)}
              runKeys={runKeys}
              backendIssue={backendDown ? { message: languageError ?? '', onRetry: retryLanguages, retrying: retryingLanguages } : null}
            />
          </Panel>
        </PanelGroup>
      </main>

      <PlaygroundModals
        showSettings={showSettings}
        onCloseSettings={() => setShowSettings(false)}
        onSaveSettings={handleSaveSettings}
        editorSettings={editorSettings}
        themeSettings={{ ...themeSettings, theme }}
        isAuthenticated={isAuthenticated}
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
        embedCode={embedCode}
        onCopyShareUrl={copyToClipboard}
        onCopyEmbed={handleCopyEmbed}
        onCloseShareModal={closeShareModal}
      />
    </div>
  );
}

/** First paint: the shell's real geometry with placeholder content, never a blank screen. */
function AppShellSkeleton({ label }: { label?: string }) {
  return (
    <div className="flex h-dvh flex-col bg-void" role="status" aria-busy="true">
      <div className="relative flex h-14 shrink-0 items-center gap-3 border-b border-hair bg-surface px-4" aria-hidden="true">
        <div className="absolute inset-x-0 top-0 flex h-[3px]">
          <span className="flex-[5] bg-dancheong-blue" />
          <span className="flex-[2] bg-dancheong-red" />
          <span className="flex-[1] bg-dancheong-yellow" />
          <span className="flex-[2] bg-dancheong-green" />
        </div>
        <span className="size-7 rounded-md bg-hover" />
        <span className="h-4 w-36 rounded-sm bg-hover max-sm:hidden" />
        <span className="h-9 w-32 rounded-md bg-hover" />
        <span className="flex-1" />
        <span className="h-9 w-20 rounded-md bg-accent/60" />
      </div>
      <div className="flex min-h-0 flex-1 max-md:flex-col">
        <div className="flex flex-1 flex-col border-hair bg-surface md:border-r" aria-hidden="true">
          <div className="h-10 border-b border-hair" />
          <EditorSkeleton />
        </div>
        <div className="flex flex-1 flex-col bg-panel max-md:border-t max-md:border-hair">
          <div className="h-10 border-b border-hair" aria-hidden="true" />
          {label && <p className="m-auto px-6 text-center text-sm text-fg-muted">{label}</p>}
        </div>
      </div>
    </div>
  );
}

export default function PlaygroundPage() {
  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <PlaygroundContent />
    </Suspense>
  );
}
