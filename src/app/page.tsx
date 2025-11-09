'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import CodeEditor from '@/components/CodeEditor';
import LanguageSelector from '@/components/LanguageSelector';
import OutputPanel from '@/components/OutputPanel';
import SettingsModal from '@/components/SettingsModal';
import {
  languagesAPI,
  executionAPI,
  shareAPI,
  settingsAPI,
  Language,
  ExecuteResponse,
  EditorSettings,
  ThemeSettings,
} from '@/lib/api';

// Force dynamic rendering for URL search params
export const dynamic = 'force-dynamic';

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

// Helper to get user ID from localStorage
const getUserId = (): string => {
  if (typeof window === 'undefined') return 'anonymous';
  let userId = localStorage.getItem('playground_user_id');
  if (!userId) {
    userId = `user_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem('playground_user_id', userId);
  }
  return userId;
};

export default function PlaygroundPage() {
  const searchParams = useSearchParams();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [output, setOutput] = useState<ExecuteResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingLanguages, setLoadingLanguages] = useState<boolean>(true);
  const [sharing, setSharing] = useState<boolean>(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [streaming, setStreaming] = useState<boolean>(false);
  const [streamEvents, setStreamEvents] = useState<Array<{type: string; message: string; timestamp: string}>>([]);
  const [editorSettings, setEditorSettings] = useState<EditorSettings>({
    font_size: 14,
    font_family: 'Fira Code, Monaco, monospace',
    tab_size: 2,
    auto_save: false,
    minimap: true,
  });
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>({
    theme: 'dark',
    color_scheme: 'vs-dark',
  });

  useEffect(() => {
    loadLanguages();
    loadUserSettings();
  }, []);

  useEffect(() => {
    const shareId = searchParams.get('share');
    if (shareId) {
      loadSharedCode(shareId);
    }
  }, [searchParams]);

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

  const handleRunStream = async () => {
    if (!code.trim()) {
      setError('Please write some code first');
      return;
    }

    setStreaming(true);
    setStreamEvents([]);
    setOutput(null);
    setError(null);

    try {
      const lang = languages.find(l => l.id === selectedLanguage);
      if (!lang) {
        throw new Error('Language not found');
      }

      const extension = lang.extensions[0] || '.txt';
      const filename = `main${extension}`;

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const response = await fetch(`${API_URL}/api/v1/execute/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language: selectedLanguage,
          files: {
            [filename]: code,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Stream failed to start');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data:')) {
            try {
              const data = JSON.parse(line.substring(5).trim());
              setStreamEvents((prev) => [...prev, data]);
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Stream execution failed:', err);
      setError(err.message || 'Stream execution failed');
    } finally {
      setStreaming(false);
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

  const loadSharedCode = async (shareId: string) => {
    try {
      const share = await shareAPI.get(shareId);
      setSelectedLanguage(share.language);

      // Get the first file's content
      const firstFile = Object.values(share.files)[0];
      setCode(firstFile || '');
      setOutput(null);
      setError(null);
    } catch (err) {
      console.error('Failed to load shared code:', err);
      setError('Failed to load shared code');
    }
  };

  const handleShare = async () => {
    if (!code.trim()) {
      setError('Please write some code first');
      return;
    }

    setSharing(true);
    setShareUrl(null);
    setError(null);

    try {
      const lang = languages.find(l => l.id === selectedLanguage);
      if (!lang) {
        throw new Error('Language not found');
      }

      const extension = lang.extensions[0] || '.txt';
      const filename = `main${extension}`;

      const share = await shareAPI.create({
        language: selectedLanguage,
        files: {
          [filename]: code,
        },
        title: `${lang.name} Code`,
        description: 'Shared from Kingsejong Playground',
      });

      const url = `${window.location.origin}${window.location.pathname}?share=${share.id}`;
      setShareUrl(url);

      // Copy to clipboard
      await navigator.clipboard.writeText(url);
    } catch (err: any) {
      console.error('Share failed:', err);
      setError(err.response?.data?.message || err.message || 'Failed to create share');
    } finally {
      setSharing(false);
    }
  };

  const handleCopyShareUrl = async () => {
    if (shareUrl) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert('Share URL copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const loadUserSettings = async () => {
    try {
      const userId = getUserId();
      const settings = await settingsAPI.get(userId);
      setEditorSettings(settings.editor);
      setThemeSettings(settings.theme);
    } catch (err) {
      // If settings don't exist, use defaults
      console.log('No saved settings found, using defaults');
    }
  };

  const handleSaveSettings = async (editor: EditorSettings, theme: ThemeSettings) => {
    try {
      const userId = getUserId();
      await settingsAPI.save({
        user_id: userId,
        editor,
        theme,
      });
      setEditorSettings(editor);
      setThemeSettings(theme);
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      setError(err.response?.data?.message || err.message || 'Failed to save settings');
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
              onClick={handleShare}
              disabled={sharing}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
            >
              {sharing ? 'Sharing...' : '🔗 Share'}
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
            >
              ⚙️ Settings
            </button>
            <button
              onClick={handleRun}
              disabled={loading || streaming}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Running...' : '▶ Run'}
            </button>
            <button
              onClick={handleRunStream}
              disabled={loading || streaming}
              className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
            >
              {streaming ? 'Streaming...' : '▶ Run (Stream)'}
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
                fontSize={editorSettings.font_size}
                fontFamily={editorSettings.font_family}
                tabSize={editorSettings.tab_size}
                minimap={editorSettings.minimap}
                theme={themeSettings.color_scheme}
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
              <OutputPanel
                output={output}
                loading={loading}
                error={error}
                streaming={streaming}
                streamEvents={streamEvents}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Share URL Modal */}
      {shareUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-white mb-4">Share Your Code</h3>
            <p className="text-sm text-gray-400 mb-4">
              Your code has been shared! The URL has been copied to clipboard.
            </p>
            <div className="bg-gray-800 border border-gray-700 rounded p-3 mb-4">
              <code className="text-sm text-blue-400 break-all">{shareUrl}</code>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCopyShareUrl}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Copy Again
              </button>
              <button
                onClick={() => setShareUrl(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={handleSaveSettings}
        initialEditor={editorSettings}
        initialTheme={themeSettings}
      />
    </div>
  );
}
