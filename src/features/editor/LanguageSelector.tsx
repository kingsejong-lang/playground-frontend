'use client';

import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import type { Language } from '@kingsejong-lang/playground-proto';

interface LanguageSelectorProps {
  languages: Language[];
  selectedLanguage: string;
  onSelect: (languageId: string) => void;
}

/** Native select (best on touch and with screen readers) styled with the tokens. */
export default function LanguageSelector({ languages, selectedLanguage, onSelect }: LanguageSelectorProps) {
  const t = useTranslations('header');
  return (
    <div className="relative shrink-0">
      <select
        id="language-select"
        value={selectedLanguage}
        onChange={(e) => onSelect(e.target.value)}
        disabled={languages.length === 0}
        className="h-9 max-w-36 appearance-none truncate rounded-md border border-strong bg-void py-0 pl-3 pr-8 text-sm font-medium text-fg hover:border-fg-muted disabled:cursor-not-allowed disabled:opacity-60 sm:max-w-44"
        aria-label={t('language')}
      >
        {languages.length === 0 && <option value={selectedLanguage}>{t('noLanguages')}</option>}
        {languages.map((lang) => (
          <option key={lang.id} value={lang.id}>
            {lang.displayName} {lang.version}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-fg-muted" aria-hidden="true" />
    </div>
  );
}
