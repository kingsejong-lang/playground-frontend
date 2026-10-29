'use client';

/**
 * The playground page (client side). `initialLanguages` comes from the server
 * page (page.tsx); without it the language list is fetched in the browser.
 */

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamicImport from 'next/dynamic';
import { useLocale, useTranslations } from 'next-intl';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

// Components
import OutputPanel from '@/features/execution/OutputPanel';
import FileTabs from '@/features/editor/FileTabs';
import { EditorSkeleton, type EditorCommand, type RevealRequest } from '@/features/editor/CodeEditor';
import { resolveEntryFile } from '@/features/editor/entry';
import { loadDraft, saveDraft } from '@/features/editor/drafts';
import { useDraft } from '@/features/editor/useDraft';
import { isPristineWorkspace, starterFileName } from '@/features/editor/workspace';
import { GLOBAL_SHORTCUTS } from '@/features/editor/shortcuts';
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
import { decodeInitialLanguages, type DiagnosticView, type InitialLanguages, type InitialLanguagesPayload } from '@/lib/rpc';
import { useFormatCode } from '@/features/editor/useFormatCode';
import { StdinPanel } from '@/features/execution/StdinPanel';
import { workspacePath } from '@/features/execution/paths';
import { Language_Capability } from '@kingsejong-lang/playground-proto';

function PlaygroundContent({ initialLanguages }: { initialLanguages: InitialLanguages | null }) {
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
  } = useLanguages(initialLanguages);

  const {
    files,
    activeFileId,
    activeFile,
    addFile,
    deleteFile,
    renameFile,
    updateFileContent,
    setActiveFile,
    entryFile,
    setEntryFile,
    replaceFiles,
  } = useFiles('main.ksj', '');

  const { editorSettings, themeSettings, error: settingsError, saveSettings } = useSettings(isAuthenticated);

  const {
    output,
    loading: executing,
    streaming,
    error: executionError,
    errorKind: executionErrorKind,
    retryAfterSeconds,
    runWorkspace,
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
  const [stdin, setStdin] = useState('');
  const [showStdin, setShowStdin] = useState(false);
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

  // Workspace and entry file (see features/editor/entry.ts)
  const workspace = useMemo(() => files.map((f) => ({ name: f.name, content: f.content })), [files]);
  const currentLanguage = languages.find((l) => l.id === selectedLanguage);
  const entryName = resolveEntryFile(
    workspace.map((f) => f.name),
    { preferred: entryFile?.name, defaultEntryFile: currentLanguage?.defaultEntryFile }
  );
  const entryId = files.find((f) => f.name === entryName)?.id ?? null;
  const running = executing || streaming;
  // Number of runs that have ended (any outcome). Exposed as data-finished-runs for end-to-end tests.
  const [finishedRuns, setFinishedRuns] = useState(0);
  const wasRunning = useRef(false);
  useEffect(() => {
    if (wasRunning.current && !running) setFinishedRuns((n) => n + 1);
    wasRunning.current = running;
  }, [running]);

  // Local drafts: Mod+S and, with the auto-save setting, after edits settle.
  const { saveNow: saveDraftNow, lastSavedAt } = useDraft({
    languageId: selectedLanguage,
    files: workspace,
    entry: entryFile?.name,
    active: activeFile?.name,
    autoSave: editorSettings.auto_save,
  });
  const draftStatus = lastSavedAt
    ? t('draft.saved', { time: new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(lastSavedAt)) })
    : null;

  // Handlers
  const runWith = useCallback(
    (preferred: string | undefined) => {
      // With the backend known to be down, Run also tries to reconnect (the banner shows progress).
      if (languageError && languageErrorKind === 'unavailable') retryLanguages();
      setRunFileId(files.find((f) => f.name === (preferred ?? entryName))?.id ?? null);
      void runWorkspace(workspace, { preferred }, selectedLanguage, languages, stdin);
    },
    [files, entryName, workspace, selectedLanguage, languages, runWorkspace, stdin, languageError, languageErrorKind, retryLanguages]
  );

  /** Runs all files from the entry file. */
  const handleExecuteCode = useCallback(() => runWith(entryFile?.name), [runWith, entryFile]);
  /** Runs all files, starting from the active file for this run only. */
  const handleRunThisFile = useCallback(() => runWith(activeFile?.name), [runWith, activeFile]);

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
    void createShare(workspace, { preferred: entryFile?.name }, selectedLanguage, languages);
  }, [createShare, workspace, entryFile, selectedLanguage, languages]);

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
      const byName = files.find((f) => f.name === workspacePath(d.path));
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

  /** Restores this language's local draft, if any, keeping the visible work as the previous language's draft. */
  const handleLanguageChange = useCallback(
    (languageId: string) => {
      const draft = loadDraft(languageId);
      if (draft) {
        if (selectedLanguage) saveDraft(selectedLanguage, { files: workspace, entry: entryFile?.name, active: activeFile?.name });
        replaceFiles(draft.files, { entry: draft.entry, active: draft.active });
        toast.info(t('draft.restored'));
      } else if (isPristineWorkspace(workspace, defaultCode)) {
        // Untouched starter code: start the new language from its own starter file (filled in below).
        replaceFiles([{ name: starterFileName(languages.find((l) => l.id === languageId)), content: '' }]);
      }
      changeLanguage(languageId);
    },
    [selectedLanguage, workspace, entryFile, activeFile, replaceFiles, changeLanguage, toast, t, defaultCode, languages]
  );

  // On first load (not a shared link), pick up this language's local draft.
  const draftChecked = useRef(false);
  useEffect(() => {
    if (draftChecked.current || loadingLanguages || !selectedLanguage) return;
    draftChecked.current = true;
    if (searchParams.get('share')) return;
    const draft = loadDraft(selectedLanguage);
    if (draft) replaceFiles(draft.files, { entry: draft.entry, active: draft.active });
  }, [loadingLanguages, selectedLanguage, searchParams, replaceFiles]);

  // Save to history when execution completes (cancelled runs are not recorded)
  useEffect(() => {
    if (output && !executing && !streaming && output.status !== 'cancelled' && output.status !== 'pending') {
      history.addItem({
        language: selectedLanguage,
        code: files.find((f) => f.id === runFileId)?.content ?? activeFile?.content ?? '',
        output,
        success: output.success,
      });
    }
  }, [output, executing, streaming]);

  // Load shared code from URL
  useEffect(() => {
    const shareIdParam = searchParams.get('share');
    if (shareIdParam) {
      loadShared(shareIdParam, (language, sharedFiles, sharedEntry) => {
        setSelectedLanguage(language);
        if (sharedFiles.length > 0) replaceFiles(sharedFiles, { entry: sharedEntry, active: sharedEntry });
        resetExecution();
      });
    }
  }, [searchParams]);

  const handleStop = useCallback(() => {
    if (running) cancelExecution();
  }, [running, cancelExecution]);

  // Global shortcuts: only run, stop, save draft and help (see features/editor/shortcuts.ts).
  // Inside the editor the same keys are Monaco actions (registered below), which take precedence.
  const { run: runKey, stop: stopKey, save: saveKey, help: helpKey } = GLOBAL_SHORTCUTS;
  useKeyboardShortcut(runKey.key, handleExecuteCode, { ctrl: runKey.mod, enabled: !running });
  useKeyboardShortcut(stopKey.key, handleStop, { ctrl: stopKey.mod, enabled: running });
  useKeyboardShortcut(saveKey.key, () => void saveDraftNow(), { ctrl: saveKey.mod });
  useKeyboardShortcut(helpKey.key, () => setShowShortcutsHelp((prev) => !prev));

  // Everything else is reachable from the menu and from the editor's command palette (F1).
  const editorCommands = useMemo<EditorCommand[]>(
    () => [
      { id: 'run', label: t('commands.run'), run: () => !running && handleExecuteCode(), key: 'run', contextMenu: true },
      { id: 'runThisFile', label: t('commands.runThisFile'), run: () => !running && handleRunThisFile(), contextMenu: true },
      { id: 'stop', label: t('commands.stop'), run: handleStop, key: 'stop' },
      { id: 'saveDraft', label: t('commands.saveDraft'), run: () => void saveDraftNow(), key: 'save' },
      { id: 'setEntry', label: t('commands.setEntry'), run: () => activeFile && setEntryFile(activeFile.id), contextMenu: true },
      { id: 'format', label: t('commands.format'), run: () => void handleFormatCode() },
      { id: 'templates', label: t('commands.templates'), run: () => setShowTemplateGallery(true) },
      { id: 'snippets', label: t('commands.snippets'), run: () => setShowSnippetLibrary(true) },
      { id: 'history', label: t('commands.history'), run: () => setShowHistory(true) },
      { id: 'share', label: t('commands.share'), run: handleShare },
      { id: 'settings', label: t('commands.settings'), run: () => setShowSettings(true) },
      { id: 'toggleFileTree', label: t('commands.toggleFileTree'), run: () => setShowFileTree((prev) => !prev) },
      { id: 'toggleLayout', label: t('commands.toggleLayout'), run: toggleOrientation },
      { id: 'toggleTheme', label: t('commands.toggleTheme'), run: toggleTheme },
      { id: 'clearOutput', label: t('commands.clearOutput'), run: resetExecution },
      { id: 'shortcuts', label: t('commands.shortcuts'), run: () => setShowShortcutsHelp(true) },
    ],
    [t, running, handleExecuteCode, handleRunThisFile, handleStop, saveDraftNow, activeFile, setEntryFile, handleFormatCode, handleShare, toggleOrientation, toggleTheme, resetExecution]
  );

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
  // Every file was sent, so a diagnostic belongs to the file its path names (no path: the entry file).
  const runDiagnostics = output?.diagnostics.filter((d) => (d.path ? workspacePath(d.path) === activeFile?.name : runFileId === activeFileId));

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
        onLanguageChange={handleLanguageChange}
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
        onSaveDraft={() => void saveDraftNow()}
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

      <main className="flex min-h-0 flex-1 overflow-hidden" data-finished-runs={finishedRuns}>
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
            entryFileId={entryId}
            onSetEntry={setEntryFile}
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
                entryFileId={entryId}
                onSetEntry={setEntryFile}
                draftStatus={draftStatus}
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
                  commands={editorCommands}
                  ariaLabel={`${t('editor.label')}: ${activeFile?.name ?? ''}`}
                  diagnostics={runDiagnostics}
                  reveal={reveal}
                />
              </div>
              {(!currentLanguage || currentLanguage.capabilities.includes(Language_Capability.STDIN)) && (
                <StdinPanel value={stdin} onChange={setStdin} open={showStdin} onToggle={() => setShowStdin((v) => !v)} />
              )}
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

export default function PlaygroundClient({ initialLanguages }: { initialLanguages?: InitialLanguagesPayload | null }) {
  const [initial] = useState(() => decodeInitialLanguages(initialLanguages));
  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <PlaygroundContent initialLanguages={initial} />
    </Suspense>
  );
}
