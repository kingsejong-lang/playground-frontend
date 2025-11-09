'use client';

import { Language } from '@/lib/api';

interface LanguageSelectorProps {
  languages: Language[];
  selectedLanguage: string;
  onSelect: (languageId: string) => void;
}

export default function LanguageSelector({ languages, selectedLanguage, onSelect }: LanguageSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="language-select" className="text-sm font-medium text-gray-300">
        Language:
      </label>
      <select
        id="language-select"
        value={selectedLanguage}
        onChange={(e) => onSelect(e.target.value)}
        className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 px-3 py-2"
      >
        {languages.map((lang) => (
          <option key={lang.id} value={lang.id}>
            {lang.name} {lang.version}
          </option>
        ))}
      </select>
    </div>
  );
}
