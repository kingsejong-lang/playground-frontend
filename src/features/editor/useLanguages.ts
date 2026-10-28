/**
 * Loads the runnable languages (LanguageService.ListLanguages), tracks the selection
 * and resolves each language's starter code.
 *
 * Starter code comes from the language's default template
 * (`Language.defaultTemplateId`, falling back to "hello_world" when the server leaves
 * it empty). When the template cannot be fetched, a built-in sample is used so a new
 * visitor never lands on an empty editor.
 *
 * Usage:
 *   const { languages, selectedLanguage, code, loading, error, retry } = useLanguages();
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import type { Language } from '@kingsejong-lang/playground-proto';
import { toRpcFailure, useRpc, type ApiClients, type RpcFailureKind } from '@/lib/rpc';
import { useFailureText } from '@/hooks/useFailureText';
import { firstFileContent } from './templates';

const DEFAULT_CODE = {
  python: `# 킹세종 플레이그라운드에 오신 것을 환영합니다
print("안녕하세요, 세상!")
print("Hello, World!")

# 계산도 해 볼까요?
result = 5 + 3
print(f"5 + 3 = {result}")
`,
  go: `package main

import "fmt"

func main() {
    // 킹세종 플레이그라운드에 오신 것을 환영합니다
    fmt.Println("안녕하세요, 세상!")
    fmt.Println("Hello, World!")

    result := 5 + 3
    fmt.Printf("5 + 3 = %d\\n", result)
}
`,
  kingsejong: `# 킹세종 플레이그라운드에 오신 것을 환영합니다
출력("안녕하세요, 킹세종!")
출력("한글로 쓰는 프로그래밍 언어")

# 계산도 해 볼까요?
결과 = 5 + 3
출력("5 + 3 =", 결과)
`,
} as const;

/** Template id used when a language does not name its own default template. */
export const FALLBACK_TEMPLATE_ID = 'hello_world';

/** Preferred default language ids, in order (new contract id first, then the legacy id). */
const PREFERRED_DEFAULTS = ['kingsejong', 'kingsejong_v0_3'];

/** Built-in starter code for a language id ("python_3_12" and "python" share the same code). */
export function defaultCodeFor(languageId: string): string {
  for (const family of Object.keys(DEFAULT_CODE) as (keyof typeof DEFAULT_CODE)[]) {
    if (languageId === family || languageId.startsWith(`${family}_`)) return DEFAULT_CODE[family];
  }
  return '// Start coding...';
}

export function pickDefaultLanguage(langs: readonly Language[]): Language | undefined {
  for (const id of PREFERRED_DEFAULTS) {
    const found = langs.find((l) => l.id === id);
    if (found) return found;
  }
  return langs.find((l) => l.id.startsWith('kingsejong')) ?? langs[0];
}

/** The template that seeds a new editor for this language. */
export function defaultTemplateId(language: Pick<Language, 'defaultTemplateId'> | undefined): string {
  return language?.defaultTemplateId || FALLBACK_TEMPLATE_ID;
}

/** Starter code from the server template, or the built-in sample when that fails. */
async function starterCode(api: ApiClients, language: Language): Promise<string> {
  try {
    const { template } = await api.language.getTemplate({ languageId: language.id, templateId: defaultTemplateId(language) });
    const content = firstFileContent(template?.files?.files ?? [], template?.entryFile);
    return content || defaultCodeFor(language.id);
  } catch {
    return defaultCodeFor(language.id);
  }
}

interface UseLanguagesReturn {
  languages: Language[];
  selectedLanguage: string;
  code: string;
  loading: boolean;
  error: string | null;
  /** Failure kind behind `error` (e.g. "unavailable" when the backend is down). */
  errorKind: RpcFailureKind | null;
  setCode: (code: string) => void;
  setSelectedLanguage: (languageId: string) => void;
  changeLanguage: (languageId: string) => void;
  loadTemplate: () => Promise<void>;
  /** Loads the language list again (after the backend comes back). */
  retry: () => void;
  /** True while a retry() is in flight. */
  retrying: boolean;
}

export function useLanguages(): UseLanguagesReturn {
  const api = useRpc();
  const t = useTranslations('errors');
  const failureText = useFailureText();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<RpcFailureKind | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { languages: langs } = await api.language.listLanguages({});
        if (cancelled) return;
        setLanguages(langs);
        setError(null);
        setErrorKind(null);
        const defaultLang = pickDefaultLanguage(langs);
        if (defaultLang) {
          setSelectedLanguage(defaultLang.id);
          const starter = await starterCode(api, defaultLang);
          if (!cancelled) setCode(starter);
        }
      } catch (err) {
        // Expected when the backend is down: keep the editor usable with the built-in sample.
        if (cancelled) return;
        setError(`${t('loadLanguages')} ${failureText(err)}`);
        setErrorKind(toRpcFailure(err).kind);
        setSelectedLanguage((current) => current || PREFERRED_DEFAULTS[0]);
        setCode((current) => current || defaultCodeFor(PREFERRED_DEFAULTS[0]));
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRetrying(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, attempt, t, failureText]);

  const changeLanguage = useCallback(
    (languageId: string) => {
      if (languages.length > 0 && !languages.some((l) => l.id === languageId)) return;
      setSelectedLanguage(languageId);
      setCode(defaultCodeFor(languageId));
      setError(null);
      setErrorKind(null);
      const lang = languages.find((l) => l.id === languageId);
      if (lang) void starterCode(api, lang).then(setCode);
    },
    [api, languages]
  );

  const loadTemplate = useCallback(async () => {
    if (!selectedLanguage) return;
    try {
      setError(null);
      setErrorKind(null);
      const lang = languages.find((l) => l.id === selectedLanguage);
      const { template } = await api.language.getTemplate({ languageId: selectedLanguage, templateId: defaultTemplateId(lang) });
      setCode(firstFileContent(template?.files?.files ?? [], template?.entryFile));
    } catch (err) {
      setError(`${t('loadTemplate')} ${failureText(err)}`);
      setErrorKind(toRpcFailure(err).kind);
    }
  }, [api, languages, selectedLanguage, t, failureText]);

  const retry = useCallback(() => {
    setRetrying(true);
    setAttempt((n) => n + 1);
  }, []);

  return {
    languages,
    selectedLanguage,
    code,
    loading,
    error,
    errorKind,
    setCode,
    setSelectedLanguage,
    changeLanguage,
    loadTemplate,
    retry,
    retrying,
  };
}
