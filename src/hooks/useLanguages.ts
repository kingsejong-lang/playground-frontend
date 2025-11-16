/**
 * Custom hook for managing programming languages.
 * Handles loading available languages and language selection.
 */

import { useState, useEffect, useCallback } from 'react';
import { languagesAPI, Language } from '@/lib/api';

const DEFAULT_CODE: Record<string, string> = {
  python_3_12: `# Welcome to Kingsejong Playground
print("안녕하세요, 세상!")
print("Hello, World!")

# Try some math
result = 5 + 3
print(f"5 + 3 = {result}")
`,
  go_1_22: `package main

import "fmt"

func main() {
    // Welcome to Kingsejong Playground
    fmt.Println("안녕하세요, 세상!")
    fmt.Println("Hello, World!")

    // Try some math
    result := 5 + 3
    fmt.Printf("5 + 3 = %d\\n", result)
}
`,
  kingsejong_v0_3: `# Welcome to Kingsejong Playground
출력("안녕하세요, KingSejong!")
출력("한글로 프로그래밍하는 자연스러운 언어")

# Try some math
결과 = 5 + 3
출력("5 + 3 = ",결과)
`,
};

interface UseLanguagesReturn {
  languages: Language[];
  selectedLanguage: string;
  code: string;
  loading: boolean;
  error: string | null;
  setCode: (code: string) => void;
  setSelectedLanguage: (languageId: string) => void;
  changeLanguage: (languageId: string) => void;
  loadTemplate: () => Promise<void>;
}

export function useLanguages(): UseLanguagesReturn {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLanguages();
  }, []);

  const loadLanguages = async () => {
    try {
      setLoading(true);
      setError(null);
      const langs = await languagesAPI.list();
      setLanguages(langs);
      if (langs.length > 0) {
        const defaultLang = langs.find(l => l.id === 'kingsejong_v0_3') || langs[0];
        setSelectedLanguage(defaultLang.id);
        setCode(DEFAULT_CODE[defaultLang.id] || '// Start coding...');
      }
    } catch (err) {
      console.error('Failed to load languages:', err);
      setError('Failed to load languages. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const changeLanguage = useCallback((languageId: string) => {
    setSelectedLanguage(languageId);
    setCode(DEFAULT_CODE[languageId] || '// Start coding...');
    setError(null);
  }, []);

  const loadTemplate = useCallback(async () => {
    if (!selectedLanguage) {
      return;
    }

    try {
      setError(null);
      const template = await languagesAPI.getTemplate(selectedLanguage, 'hello_world');
      setCode(template.content);
    } catch (err) {
      console.error('Failed to load template:', err);
      setError('Failed to load template');
    }
  }, [selectedLanguage]);

  return {
    languages,
    selectedLanguage,
    code,
    loading,
    error,
    setCode,
    setSelectedLanguage,
    changeLanguage,
    loadTemplate,
  };
}
