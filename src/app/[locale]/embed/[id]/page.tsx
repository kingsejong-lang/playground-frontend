'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import dynamicImport from 'next/dynamic';
import OutputPanel from '@/components/OutputPanel';
import { useCodeExecution } from '@/hooks/useCodeExecution';
import { shareAPI } from '@/lib/api';

// Dynamic imports
const CodeEditor = dynamicImport(() => import('@/components/CodeEditor'), {
  loading: () => (
    <div className="h-full flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Loading editor...</p>
      </div>
    </div>
  ),
  ssr: false,
});

// Force dynamic rendering
export const dynamic = 'force-dynamic';

function EmbedContent() {
  const params = useParams();
  const shareId = params.id as string;

  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('kingsejong_v0_3');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    output,
    loading: executing,
    streaming,
    streamEvents,
    error: executionError,
    execute,
    reset: resetExecution,
  } = useCodeExecution({
    enableWebSocket: false, // Use HTTP for embed mode
  });

  // Load shared code
  useEffect(() => {
    const loadShare = async () => {
      if (!shareId) {
        setError('Share ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const share = await shareAPI.get(shareId);

        // Get the main file content
        let mainContent = '';
        if (share.files['main.ksj']) {
          mainContent = share.files['main.ksj'];
        } else if (share.files['main.py']) {
          mainContent = share.files['main.py'];
        } else if (share.files['main.go']) {
          mainContent = share.files['main.go'];
        } else {
          // Get first file
          const firstFile = Object.values(share.files)[0];
          mainContent = firstFile || '';
        }

        setCode(mainContent);
        setLanguage(share.language);
        setError(null);
      } catch (err) {
        console.error('Failed to load shared code:', err);
        setError('Failed to load shared code');
      } finally {
        setLoading(false);
      }
    };

    loadShare();
  }, [shareId]);

  const handleExecute = () => {
    execute(code, language, []);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950 text-white">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-2">Error</h1>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {/* Minimal Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-white">
              킹세종 Playground
            </h1>
            <span className="text-xs text-gray-500">Embed Mode</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExecute}
              disabled={executing || streaming}
              className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
              aria-label="Run code"
              aria-busy={executing || streaming}
            >
              {executing || streaming ? 'Running...' : '▶ Run'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Panel */}
        <div className="w-1/2 border-r border-gray-800">
          <div className="h-full">
            <CodeEditor
              value={code}
              onChange={setCode}
              language={language}
              readOnly={true}
              fontSize={14}
              fontFamily="Fira Code, Monaco, monospace"
              tabSize={2}
              minimap={false}
              theme="vs-dark"
            />
          </div>
        </div>

        {/* Output Panel */}
        <div className="w-1/2">
          <div className="h-full flex flex-col">
            <div className="bg-gray-900 px-4 py-2 border-b border-gray-800">
              <h2 className="text-sm font-medium text-gray-300">Output</h2>
            </div>
            <div className="flex-1 min-h-0">
              <OutputPanel
                output={output}
                loading={executing}
                error={executionError}
                streaming={streaming}
                streamEvents={streamEvents}
                onClear={resetExecution}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Attribution */}
      <footer className="bg-gray-900 border-t border-gray-800 px-4 py-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Powered by 킹세종 Playground</span>
          <a
            href={`/?share=${shareId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            Open in full editor →
          </a>
        </div>
      </footer>
    </div>
  );
}

export default function EmbedPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-gray-950 text-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading...</p>
          </div>
        </div>
      }
    >
      <EmbedContent />
    </Suspense>
  );
}
