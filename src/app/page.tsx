'use client';

import { useState, useEffect } from 'react';
import CodeEditor from '@/components/CodeEditor';
import LanguageSelector from '@/components/LanguageSelector';
import OutputPanel from '@/components/OutputPanel';
import { languagesAPI, executionAPI, Language, ExecuteResponse } from '@/lib/api';

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
  kingsejong_v1_0: `함수 시작() {
    // Welcome to Kingsejong Playground
    출력("안녕, 세상!");
    출력("Hello, World!");
}
`,
};

export default function PlaygroundPage() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [output, setOutput] = useState<ExecuteResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingLanguages, setLoadingLanguages] = useState<boolean>(true);

  useEffect(() => {
    loadLanguages();
  }, []);

  const loadLanguages = async () => {
    try {
      setLoadingLanguages(true);
      const langs = await languagesAPI.list();
      setLanguages(langs);
      if (langs.length > 0) {
        const defaultLang = langs.find(l => l.id === 'python_3_12') || langs[0];
        setSelectedLanguage(defaultLang.id);
        setCode(DEFAULT_CODE[defaultLang.id] || '// Start coding...');
      }
    } catch (err) {
      console.error('Failed to load languages:', err);
      setError('Failed to load languages. Make sure the backend is running.');
    } finally {
      setLoadingLanguages(false);
    }
  };

  const handleLanguageChange = (languageId: string) => {
    setSelectedLanguage(languageId);
    setCode(DEFAULT_CODE[languageId] || '// Start coding...');
    setOutput(null);
    setError(null);
  };

  const handleRun = async () => {
    if (!code.trim()) {
      setError('Please write some code first');
      return;
    }

    setLoading(true);
    setOutput(null);
    setError(null);

    try {
      const lang = languages.find(l => l.id === selectedLanguage);
      if (!lang) {
        throw new Error('Language not found');
      }

      // Determine filename based on language
      const extension = lang.extensions[0] || '.txt';
      const filename = `main${extension}`;

      const result = await executionAPI.execute({
        language: selectedLanguage,
        files: {
          [filename]: code,
        },
      });

      setOutput(result);
    } catch (err: any) {
      console.error('Execution failed:', err);
      setError(err.response?.data?.message || err.message || 'Execution failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadTemplate = async () => {
    try {
      const template = await languagesAPI.getTemplate(selectedLanguage, 'hello_world');
      setCode(template.content);
      setOutput(null);
      setError(null);
    } catch (err) {
      console.error('Failed to load template:', err);
    }
  };

  if (loadingLanguages) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">킹세종 Playground</h1>
            <p className="text-sm text-gray-400 mt-1">Write, compile, and run code in your browser</p>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSelector
              languages={languages}
              selectedLanguage={selectedLanguage}
              onSelect={handleLanguageChange}
            />
            <button
              onClick={handleLoadTemplate}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Load Template
            </button>
            <button
              onClick={handleRun}
              disabled={loading}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Running...' : '▶ Run'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Panel */}
        <div className="w-1/2 border-r border-gray-800">
          <div className="h-full flex flex-col">
            <div className="bg-gray-900 px-4 py-2 border-b border-gray-800">
              <h2 className="text-sm font-medium text-gray-300">Code Editor</h2>
            </div>
            <div className="flex-1">
              <CodeEditor
                value={code}
                onChange={setCode}
                language={selectedLanguage}
              />
            </div>
          </div>
        </div>

        {/* Output Panel */}
        <div className="w-1/2">
          <div className="h-full flex flex-col">
            <div className="bg-gray-900 px-4 py-2 border-b border-gray-800">
              <h2 className="text-sm font-medium text-gray-300">Output</h2>
            </div>
            <div className="flex-1">
              <OutputPanel output={output} loading={loading} error={error} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
