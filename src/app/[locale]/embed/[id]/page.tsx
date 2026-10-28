'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import dynamicImport from 'next/dynamic';
import { useLocale, useTranslations } from 'next-intl';
import { AlertTriangle, ExternalLink, Play, Square } from 'lucide-react';
import type { SourceFile } from '@kingsejong-lang/playground-proto';
import OutputPanel from '@/features/execution/OutputPanel';
import { EditorSkeleton } from '@/features/editor/CodeEditor';
import { useCodeExecution } from '@/features/execution/useCodeExecution';
import { fetchShare } from '@/features/share/useShare';
import { resolveEntryFile } from '@/features/editor/entry';
import { GLOBAL_SHORTCUTS } from '@/features/editor/shortcuts';
import { useTheme } from '@/features/settings/useTheme';
import { useFailureText } from '@/hooks/useFailureText';
import { useModifierKey } from '@/components/ui/Kbd';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { Button, buttonClass } from '@/components/ui/Button';
import { toRpcFailure, useRpc } from '@/lib/rpc';

const CodeEditor = dynamicImport(() => import('@/features/editor/CodeEditor'), {
  loading: () => <EditorSkeleton />,
  ssr: false,
});

function EmbedContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const shareId = params.id as string;
  const api = useRpc();
  const locale = useLocale();
  const t = useTranslations();
  const failureText = useFailureText();
  const mod = useModifierKey();
  const { resolvedTheme } = useTheme();
  // Embedders can pin a theme with ?theme=light|dark without touching the visitor's preference.
  const forcedTheme = searchParams.get('theme');
  const theme = forcedTheme === 'light' || forcedTheme === 'dark' ? forcedTheme : resolvedTheme;

  const [files, setFiles] = useState<SourceFile[]>([]);
  const [entryPath, setEntryPath] = useState('');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('kingsejong');
  const [languageLabel, setLanguageLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { output, loading: executing, streaming, error: executionError, errorKind, executeFiles, cancel, reset } = useCodeExecution();
  const running = executing || streaming;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('light', theme === 'light');
  }, [theme]);

  useEffect(() => {
    const loadShare = async () => {
      if (!shareId) {
        setError(t('embed.missingId'));
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const share = await fetchShare(api, shareId);
        // The language tells us its default entry file; without it the share's own entry or the first file is used.
        const lang = await api.language
          .getLanguage({ languageId: share.languageId })
          .then((r) => r.language)
          .catch(() => undefined);
        const shareFiles = share.files?.files ?? [];
        // Same rule as the editor (features/editor/entry.ts).
        const entry = resolveEntryFile(
          shareFiles.map((f) => f.path),
          { preferred: share.entryFile, defaultEntryFile: lang?.defaultEntryFile }
        );
        setFiles(shareFiles);
        setEntryPath(entry ?? '');
        setCode(shareFiles.find((f) => f.path === entry)?.content ?? '');
        setLanguage(share.languageId);
        setLanguageLabel(lang ? `${lang.displayName} ${lang.version}`.trim() : share.languageId);
        setError(null);
      } catch (err) {
        setError(toRpcFailure(err).kind === 'not_found' ? t('embed.notFound') : `${t('errors.loadShare')} ${failureText(err)}`);
      } finally {
        setLoading(false);
      }
    };
    loadShare();
  }, [api, shareId, t, failureText]);

  const handleExecute = () => {
    // Run the shared program as stored (all files), entry file first.
    executeFiles({ languageId: language, files: files.map(({ path, content }) => ({ path, content })), entryFile: entryPath || undefined });
  };

  useKeyboardShortcut(GLOBAL_SHORTCUTS.run.key, handleExecute, { ctrl: true, enabled: !running && !loading && !error });
  useKeyboardShortcut(GLOBAL_SHORTCUTS.stop.key, cancel, { ctrl: true, enabled: running });

  const fullEditorHref = `/${locale}?share=${encodeURIComponent(shareId)}`;

  if (error) {
    return (
      <div className="flex h-dvh items-center justify-center bg-void p-6">
        <div className="max-w-sm text-center" role="alert">
          <AlertTriangle className="mx-auto mb-3 size-6 text-warn" aria-hidden="true" />
          <h1 className="text-base font-semibold text-fg">{t('embed.errorTitle')}</h1>
          <p className="mt-1 text-sm text-fg-secondary">{error}</p>
          <a href={`/${locale}`} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm text-accent-text underline-offset-4 hover:underline">
            {t('embed.newCode')}
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-void">
      <header className="relative flex h-12 shrink-0 items-center gap-2 border-b border-hair bg-surface px-3">
        <div className="pointer-events-none absolute inset-x-0 top-0 flex h-0.5" aria-hidden="true">
          <span className="flex-[5] bg-dancheong-blue" />
          <span className="flex-[2] bg-dancheong-red" />
          <span className="flex-[1] bg-dancheong-yellow" />
          <span className="flex-[2] bg-dancheong-green" />
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- tiny static SVG mark */}
        <img src="/icon.svg" alt="" width={22} height={22} className="size-[22px] rounded-sm" />
        <h1 className="min-w-0 truncate text-sm font-semibold text-fg">{t('app.title')}</h1>
        {languageLabel && <span className="shrink-0 rounded-sm bg-hover px-1.5 py-0.5 text-xs text-fg-secondary">{languageLabel}</span>}
        <span className="flex-1" />
        {running ? (
          <Button variant="danger" size="sm" icon={<Square className="fill-current" />} onClick={cancel} title={t('header.stopLabel')}>
            {t('header.stop')}
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            icon={<Play className="fill-current" />}
            onClick={handleExecute}
            disabled={loading}
            title={t('header.runLabel', { shortcut: `${mod} Enter` })}
          >
            {t('header.run')}
          </Button>
        )}
      </header>

      <main className="flex min-h-0 flex-1 max-sm:flex-col">
        <section className="flex min-h-0 flex-col border-hair max-sm:h-1/2 max-sm:border-b sm:w-1/2 sm:border-r" aria-label={t('editor.label')}>
          <p className="flex h-8 shrink-0 items-center gap-2 border-b border-hair bg-surface px-3 text-xs text-fg-muted">
            <span className="font-mono text-fg-secondary">{entryPath}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{t('embed.readOnly')}</span>
          </p>
          <div className="min-h-0 flex-1">
          {loading ? (
            <EditorSkeleton label={t('common.loading')} />
          ) : (
            <CodeEditor
              value={code}
              onChange={setCode}
              language={language}
              readOnly={true}
              fontSize={14}
              tabSize={2}
              minimap={false}
              theme={theme === 'dark' ? 'code-sanctuary-dark' : 'code-sanctuary-light'}
              ariaLabel={`${t('editor.label')}: ${entryPath}`}
            />
          )}
          </div>
        </section>
        <div className="min-h-0 flex-1 sm:w-1/2">
          <OutputPanel
            output={output}
            loading={executing}
            error={executionError}
            errorKind={errorKind}
            streaming={streaming}
            onClear={reset}
            onRetry={handleExecute}
            runKeys={[mod, 'Enter']}
          />
        </div>
      </main>

      <footer className="flex h-9 shrink-0 items-center justify-between gap-3 border-t border-hair bg-surface px-3 text-xs text-fg-muted">
        <span className="truncate">{t('embed.poweredBy')}</span>
        <a href={fullEditorHref} target="_blank" rel="noopener noreferrer" className={buttonClass({ variant: 'ghost', size: 'sm', className: 'h-7 px-2 text-xs text-accent-text' })}>
          {t('embed.openFull')}
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      </footer>
    </div>
  );
}

export default function EmbedPage() {
  return (
    <Suspense fallback={<div className="h-dvh bg-void" aria-busy="true" />}>
      <EmbedContent />
    </Suspense>
  );
}
