'use client';

import { Language } from '@/lib/api';

interface LanguageSelectorProps {
  languages: Language[];
  selectedLanguage: string;
  onSelect: (languageId: string) => void;
}

export default function LanguageSelector({ languages, selectedLanguage, onSelect }: LanguageSelectorProps) {
  return (
    <select
      id="language-select"
      value={selectedLanguage}
      onChange={(e) => onSelect(e.target.value)}
      className="text-sm rounded-lg px-3 py-2 focus:outline-none"
      style={{
        backgroundColor: 'var(--bg-void)',
        border: '1px solid var(--border-hair)',
        color: 'var(--text-primary)'
      }}
      onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent-indigo)'}
      onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-hair)'}
      aria-label="Select programming language"
    >
      {languages.map((lang) => (
        <option key={lang.id} value={lang.id}>
          {lang.name} {lang.version}
        </option>
      ))}
    </select>
  );
}
