/**
 * Playground header: brand, language, the Run/Stop control and everything else.
 *
 * Responsive tiers (one primary action at every width):
 *   < sm   mark + language + Run + "more" menu
 *   < lg   title + language + Run + "more" menu
 *   lg     icon buttons for templates/history/share/theme/settings
 *   xl     labels next to the icons and the Run shortcut hint
 */

'use client';

import { useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  BookMarked,
  FolderTree,
  History,
  Keyboard,
  LayoutPanelTop,
  LogIn,
  LogOut,
  Columns2,
  Menu,
  Moon,
  Play,
  Settings,
  Share2,
  Square,
  Sun,
  WandSparkles,
  FileText,
} from 'lucide-react';
import LanguageSelector from '@/features/editor/LanguageSelector';
import LanguageToggle from '@/components/LanguageToggle';
import { Button, IconButton, buttonClass } from '@/components/ui/Button';
import { KeyCombo } from '@/components/ui/Kbd';
import type { Language } from '@kingsejong-lang/playground-proto';
import type { User } from '@/features/auth/AuthContext';

interface PlaygroundHeaderProps {
  languages: Language[];
  selectedLanguage: string;
  onLanguageChange: (languageId: string) => void;
  user: User | null;
  isAuthenticated: boolean;
  onLogout: () => void;
  onOpenAuth: () => void;
  resolvedTheme: 'light' | 'dark';
  onToggleTheme: () => void;
  orientation: 'horizontal' | 'vertical';
  onToggleOrientation: () => void;
  /** Hide the layout switch where panels are always stacked (narrow screens). */
  canChangeLayout: boolean;
  onOpenTemplates: () => void;
  onOpenSnippets: () => void;
  onOpenHistory: () => void;
  onToggleFileTree: () => void;
  onFormat: () => void;
  onOpenShortcuts: () => void;
  onShare: () => void;
  sharing: boolean;
  onOpenSettings: () => void;
  onExecute: () => void;
  executing: boolean;
  streaming: boolean;
  onCancel: () => void;
  /** Keys of the Run shortcut, e.g. ["⌘", "Enter"]. */
  runKeys: string[];
}

export function PlaygroundHeader({
  languages,
  selectedLanguage,
  onLanguageChange,
  user,
  isAuthenticated,
  onLogout,
  onOpenAuth,
  resolvedTheme,
  onToggleTheme,
  orientation,
  onToggleOrientation,
  canChangeLayout,
  onOpenTemplates,
  onOpenSnippets,
  onOpenHistory,
  onToggleFileTree,
  onFormat,
  onOpenShortcuts,
  onShare,
  sharing,
  onOpenSettings,
  onExecute,
  executing,
  streaming,
  onCancel,
  runKeys,
}: PlaygroundHeaderProps) {
  const t = useTranslations();
  const menuRef = useRef<HTMLDivElement>(null);
  const isRunning = executing || streaming;
  const themeLabel = resolvedTheme === 'dark' ? t('header.themeLight') : t('header.themeDark');
  const layoutLabel = orientation === 'horizontal' ? t('header.layoutVertical') : t('header.layoutHorizontal');
  const shortcutText = runKeys.join(' ');

  /** Runs a menu action and closes the popover. */
  const fromMenu = (action: () => void) => () => {
    menuRef.current?.hidePopover?.();
    action();
  };

  return (
    <header className="relative flex h-14 shrink-0 items-center gap-2 border-b border-hair bg-surface px-3 sm:gap-3 sm:px-4">
      {/* Dancheong band: the four obangsaek accents as a hairline signature. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex h-[3px]" aria-hidden="true">
        <span className="flex-[5] bg-dancheong-blue" />
        <span className="flex-[2] bg-dancheong-red" />
        <span className="flex-[1] bg-dancheong-yellow" />
        <span className="flex-[2] bg-dancheong-green" />
      </div>

      {/* Brand */}
      <div className="flex min-w-0 items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element -- tiny static SVG mark */}
        <img src="/icon.svg" alt="" width={28} height={28} className="size-7 shrink-0 rounded-md" />
        <div className="min-w-0 max-sm:sr-only">
          <h1 className="truncate text-[15px] font-semibold leading-tight text-fg">{t('app.title')}</h1>
          <p className="truncate text-xs leading-tight text-fg-muted max-xl:hidden">{t('app.description')}</p>
        </div>
      </div>

      <LanguageSelector languages={languages} selectedLanguage={selectedLanguage} onSelect={onLanguageChange} />

      <div className="flex-1" />

      {/* Desktop actions */}
      <nav className="flex items-center gap-1 max-lg:hidden" aria-label={t('header.tools')}>
        <HeaderAction icon={<FileText />} label={t('header.templates')} onClick={onOpenTemplates} />
        <HeaderAction icon={<History />} label={t('header.history')} onClick={onOpenHistory} />
        <HeaderAction
          icon={<Share2 />}
          label={sharing ? t('header.sharing') : t('header.share')}
          onClick={onShare}
          disabled={sharing}
          aria-busy={sharing}
        />
        <span className="mx-1.5 h-5 w-px bg-hair" aria-hidden="true" />
        <IconButton label={themeLabel} icon={resolvedTheme === 'dark' ? <Sun /> : <Moon />} onClick={onToggleTheme} />
        <IconButton label={t('header.settings')} icon={<Settings />} onClick={onOpenSettings} />
        {isAuthenticated ? (
          <Button variant="ghost" icon={<LogOut />} onClick={onLogout} title={t('header.signedInAs', { name: user?.name || user?.email || '' })}>
            <span className="max-w-28 truncate max-xl:sr-only">{user?.name || user?.email}</span>
            <span className="sr-only">{t('header.logout')}</span>
          </Button>
        ) : (
          <Button variant="ghost" icon={<LogIn />} onClick={onOpenAuth}>
            <span className="max-xl:sr-only">{t('header.login')}</span>
          </Button>
        )}
      </nav>

      {/* "More": secondary actions at every width, primary ones too below lg */}
      <button
        type="button"
        popoverTarget="header-more-menu"
        className={buttonClass({ variant: 'ghost', iconOnly: true, className: 'px-0' })}
        aria-label={t('header.more')}
        title={t('header.more')}
      >
        <Menu className="size-4" aria-hidden="true" />
      </button>
      <div
        ref={menuRef}
        id="header-more-menu"
        popover="auto"
        className="fixed inset-auto top-14 right-2 m-0 w-64 max-w-[calc(100vw-1rem)] rounded-lg border border-hair bg-raised p-1.5 text-fg shadow-raised"
      >
        <div className="lg:hidden">
          <MenuItem icon={<FileText />} label={t('header.templates')} onClick={fromMenu(onOpenTemplates)} />
          <MenuItem icon={<History />} label={t('header.history')} onClick={fromMenu(onOpenHistory)} />
          <MenuItem icon={<Share2 />} label={sharing ? t('header.sharing') : t('header.share')} onClick={fromMenu(onShare)} disabled={sharing} />
          <MenuDivider />
        </div>
        <MenuItem icon={<BookMarked />} label={t('snippets.title')} hint={[runKeys[0], 'L']} onClick={fromMenu(onOpenSnippets)} />
        <MenuItem icon={<FolderTree />} label={t('files.toggleTree')} hint={[runKeys[0], 'F']} onClick={fromMenu(onToggleFileTree)} />
        <MenuItem icon={<WandSparkles />} label={t('shortcuts.format')} hint={[runKeys[0], 'Shift', 'F']} onClick={fromMenu(onFormat)} />
        {canChangeLayout && (
          <MenuItem icon={orientation === 'horizontal' ? <LayoutPanelTop /> : <Columns2 />} label={layoutLabel} onClick={fromMenu(onToggleOrientation)} />
        )}
        <div className="lg:hidden">
          <MenuItem icon={resolvedTheme === 'dark' ? <Sun /> : <Moon />} label={themeLabel} onClick={fromMenu(onToggleTheme)} />
          <MenuItem icon={<Settings />} label={t('header.settings')} onClick={fromMenu(onOpenSettings)} />
        </div>
        <MenuItem icon={<Keyboard />} label={t('header.shortcuts')} hint={['?']} onClick={fromMenu(onOpenShortcuts)} />
        <MenuDivider />
        <p className="px-3 pb-1 pt-1.5 text-xs font-medium text-fg-muted">{t('header.uiLanguage')}</p>
        <LanguageToggle variant="menu" onSwitch={() => menuRef.current?.hidePopover?.()} />
        <div className="lg:hidden">
          <MenuDivider />
          {isAuthenticated ? (
            <MenuItem icon={<LogOut />} label={`${t('header.logout')} (${user?.name || user?.email})`} onClick={fromMenu(onLogout)} />
          ) : (
            <MenuItem icon={<LogIn />} label={t('header.login')} onClick={fromMenu(onOpenAuth)} />
          )}
        </div>
      </div>

      {/* Primary action */}
      {isRunning ? (
        <Button variant="danger" icon={<Square className="fill-current" />} onClick={onCancel} title={t('header.stopLabel')} className="min-w-20 xl:min-w-40">
          {t('header.stop')}
        </Button>
      ) : (
        <Button
          variant="primary"
          icon={<Play className="fill-current" />}
          onClick={onExecute}
          title={t('header.runLabel', { shortcut: shortcutText })}
          aria-keyshortcuts={runKeys[0] === '⌘' ? 'Meta+Enter' : 'Control+Enter'}
          className="min-w-20 xl:min-w-40"
        >
          {t('header.run')}
          <KeyCombo keys={runKeys} className="ml-1 max-xl:hidden [&_kbd]:border-white/35 [&_kbd]:bg-black/25 [&_kbd]:text-on-accent" />
        </Button>
      )}
    </header>
  );
}

function HeaderAction({
  icon,
  label,
  ...props
}: { icon: React.ReactNode; label: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={buttonClass({ variant: 'ghost', className: 'max-xl:w-9 max-xl:px-0' })}
      title={label}
      {...props}
    >
      <span className="inline-flex size-4 items-center justify-center [&>svg]:size-4" aria-hidden="true">
        {icon}
      </span>
      <span className="max-xl:sr-only">{label}</span>
    </button>
  );
}

function MenuItem({
  icon,
  label,
  hint,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string[];
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-9 w-full items-center gap-3 rounded-md px-3 text-left text-sm text-fg-secondary hover:bg-hover hover:text-fg disabled:opacity-50"
    >
      <span className="inline-flex size-4 shrink-0 items-center justify-center text-fg-muted [&>svg]:size-4" aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {hint && <KeyCombo keys={hint} className="shrink-0 max-sm:hidden" />}
    </button>
  );
}

function MenuDivider() {
  return <div className="my-1.5 h-px bg-hair" role="separator" />;
}
