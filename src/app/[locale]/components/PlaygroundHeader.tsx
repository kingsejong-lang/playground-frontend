/**
 * Playground header component - Control Sanctum
 */

'use client';

import { useTranslations } from 'next-intl';
import { Play, Settings, Share2, History, FileText, Moon, Sun, Layout } from 'lucide-react';
import LanguageSelector from '@/components/LanguageSelector';
import { HeaderButton, HeaderDivider } from '@/components/ui/HeaderButton';
import { Language } from '@/lib/api';
import { User } from '@/contexts/AuthContext';

interface PlaygroundHeaderProps {
  /** Available languages */
  languages: Language[];
  /** Currently selected language */
  selectedLanguage: string;
  /** Callback when language changes */
  onLanguageChange: (languageId: string) => void;
  /** Current user */
  user: User | null;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Callback for logout */
  onLogout: () => void;
  /** Callback to open auth modal */
  onOpenAuth: () => void;
  /** Current theme */
  resolvedTheme: 'light' | 'dark';
  /** Toggle theme */
  onToggleTheme: () => void;
  /** Current layout orientation */
  orientation: 'horizontal' | 'vertical';
  /** Toggle orientation */
  onToggleOrientation: () => void;
  /** Open template gallery */
  onOpenTemplates: () => void;
  /** Open history */
  onOpenHistory: () => void;
  /** Share code */
  onShare: () => void;
  /** Whether sharing is in progress */
  sharing: boolean;
  /** Open settings */
  onOpenSettings: () => void;
  /** Execute code */
  onExecute: () => void;
  /** Whether executing */
  executing: boolean;
  /** Whether streaming */
  streaming: boolean;
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
  onOpenTemplates,
  onOpenHistory,
  onShare,
  sharing,
  onOpenSettings,
  onExecute,
  executing,
  streaming,
}: PlaygroundHeaderProps) {
  const t = useTranslations();
  const isRunning = executing || streaming;

  return (
    <header
      className="px-6 py-4"
      style={{
        backgroundColor: 'var(--editor-zone)',
        borderBottom: '1px solid var(--border-hair)',
      }}
    >
      <div className="flex items-center justify-between">
        {/* Title */}
        <div>
          <h1
            className="text-xl font-light tracking-wide"
            style={{ color: 'var(--text-primary)' }}
          >
            {t('app.title')}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-whisper)' }}>
            {t('app.description')}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Language Selector */}
          <LanguageSelector
            languages={languages}
            selectedLanguage={selectedLanguage}
            onSelect={onLanguageChange}
          />

          {/* Secondary Actions */}
          <HeaderButton
            icon={<FileText className="w-4 h-4" />}
            label="Templates"
            onClick={onOpenTemplates}
            aria-label="Open template gallery"
          />
          <HeaderButton
            icon={<History className="w-4 h-4" />}
            label="History"
            onClick={onOpenHistory}
            aria-label="Open execution history"
          />
          <HeaderButton
            icon={<Share2 className="w-4 h-4" />}
            label={sharing ? 'Sharing...' : 'Share'}
            onClick={onShare}
            disabled={sharing}
            loading={sharing}
            aria-label="Share code"
            aria-busy={sharing}
          />

          <HeaderDivider />

          {/* Layout & Theme */}
          <HeaderButton
            icon={<Layout className="w-4 h-4" />}
            iconOnly
            onClick={onToggleOrientation}
            aria-label={`Switch to ${orientation === 'horizontal' ? 'vertical' : 'horizontal'} layout`}
          />
          <HeaderButton
            icon={resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            iconOnly
            onClick={onToggleTheme}
            aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
          />
          <HeaderButton
            icon={<Settings className="w-4 h-4" />}
            iconOnly
            onClick={onOpenSettings}
            aria-label="Open settings"
          />

          <HeaderDivider />

          {/* Auth */}
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">
                {user?.name || user?.email}
              </span>
              <button
                onClick={onLogout}
                className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
                aria-label="Logout from account"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              aria-label="Open login modal"
            >
              Login
            </button>
          )}

          {/* Primary Action */}
          <HeaderButton
            icon={<Play className="w-4 h-4" />}
            label={isRunning ? 'Running...' : 'Run'}
            variant="primary"
            onClick={onExecute}
            disabled={isRunning}
            loading={isRunning}
            aria-label="Run code"
            aria-busy={isRunning}
          />
        </div>
      </div>
    </header>
  );
}
