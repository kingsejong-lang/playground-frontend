'use client';

import { useRef, useEffect, useState } from 'react';
import { ExecuteResponse } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { AnsiText, stripAnsi } from '@/lib/ansi-parser';

interface OutputPanelProps {
  output: ExecuteResponse | null;
  loading: boolean;
  error: string | null;
  streaming?: boolean;
  streamEvents?: Array<{type: string; message: string; timestamp: string}>;
  onClear?: () => void;
}

export default function OutputPanel({ output, loading, error, streaming, streamEvents, onClear }: OutputPanelProps) {
  const toast = useToast();
  const outputRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showLineNumbers, setShowLineNumbers] = useState(false);

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    if (autoScroll && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output, streamEvents, autoScroll]);

  // Extract all text content for copy/download/search (strip ANSI codes)
  const getOutputText = (): string => {
    if (error) return stripAnsi(error);

    if (streaming && streamEvents) {
      return streamEvents.map(e => stripAnsi(`[${e.type}] ${e.message}`)).join('\n');
    }

    if (!output) return '';

    const lines: string[] = [];

    if (output.error) {
      lines.push(`Error: ${output.error.code}`);
      lines.push(stripAnsi(output.error.message));
      if (output.error.details) lines.push(stripAnsi(output.error.details));
    }

    output.events.forEach(event => {
      if (event.kind === 'KIND_COMPILE') {
        lines.push(stripAnsi(`[Compilation] ${event.message}`));
      } else {
        lines.push(stripAnsi(event.message));
      }
    });

    return lines.join('\n');
  };

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      const text = getOutputText();
      if (!text) {
        toast.warning('No output to copy');
        return;
      }
      await navigator.clipboard.writeText(text);
      toast.success('Output copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  // Download as text file
  const handleDownload = () => {
    const text = getOutputText();
    if (!text) {
      toast.warning('No output to download');
      return;
    }

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `output-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Output downloaded');
  };

  // Highlight search matches
  const highlightText = (text: string): React.ReactNode => {
    if (!searchQuery.trim()) return text;

    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={index} className="bg-yellow-500 text-black">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };
  if (loading || streaming) {
    return (
      <div className="h-full bg-gray-900 flex flex-col">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-700">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          <span className="text-sm text-gray-400">{streaming ? 'Streaming execution...' : 'Executing code...'}</span>
        </div>
        {streaming && streamEvents && streamEvents.length > 0 && (
          <div className="flex-1 overflow-auto p-4">
            {streamEvents.map((event, index) => (
              <div key={index} className="mb-2">
                <div className="text-xs text-gray-500 mb-1">
                  [{event.type}] {new Date(event.timestamp).toLocaleTimeString()}
                </div>
                <pre className="text-gray-200 text-sm font-mono whitespace-pre-wrap">{event.message}</pre>
              </div>
            ))}
          </div>
        )}
        {!streaming && !streamEvents?.length && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-400">Executing code...</p>
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full bg-gray-900 p-4 overflow-auto">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <h3 className="text-red-400 font-semibold mb-2">Error</h3>
          <pre className="text-red-300 text-sm whitespace-pre-wrap">{error}</pre>
        </div>
      </div>
    );
  }

  if (!output) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900 text-gray-500">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
          </svg>
          <p>Run your code to see output</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-900 flex flex-col">
      {/* Header with toolbar */}
      <div className="border-b border-gray-700">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-4">
            <span className={`text-sm font-medium ${output.success ? 'text-green-400' : 'text-red-400'}`}>
              {output.success ? '✓ Success' : '✗ Failed'}
            </span>
            {output.metrics && (
              <div className="flex gap-4 text-xs text-gray-400">
                {output.metrics.compile_time_ms > 0 && (
                  <span>Compile: {output.metrics.compile_time_ms}ms</span>
                )}
                <span>Run: {output.metrics.run_time_ms}ms</span>
                <span>Memory: {(output.metrics.memory_bytes / 1024 / 1024).toFixed(1)}MB</span>
              </div>
            )}
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
              title="Search (Ctrl+F)"
              aria-label="Toggle search"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            <button
              onClick={() => setShowLineNumbers(!showLineNumbers)}
              className={`p-1.5 rounded transition-colors ${showLineNumbers ? 'text-blue-400 bg-blue-900/20' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
              title="Toggle line numbers"
              aria-label="Toggle line numbers"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`p-1.5 rounded transition-colors ${autoScroll ? 'text-blue-400 bg-blue-900/20' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
              title="Toggle auto-scroll"
              aria-label="Toggle auto-scroll"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>

            <button
              onClick={handleCopy}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
              title="Copy output"
              aria-label="Copy output to clipboard"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>

            <button
              onClick={handleDownload}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
              title="Download output"
              aria-label="Download output as text file"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>

            {onClear && (
              <button
                onClick={onClear}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
                title="Clear output"
                aria-label="Clear output"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Search bar */}
        {showSearch && (
          <div className="px-4 pb-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in output..."
              className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Output */}
      <div ref={outputRef} className="flex-1 overflow-auto p-4">
        {output.error ? (
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-4">
            <h3 className="text-red-400 font-semibold mb-2">{output.error.code}</h3>
            <p className="text-red-300 text-sm mb-2">{output.error.message}</p>
            {output.error.details && (
              <pre className="text-red-300/80 text-xs whitespace-pre-wrap">{output.error.details}</pre>
            )}
          </div>
        ) : null}

        {output.events.map((event, index) => {
          const isStdout = event.kind === 'KIND_STDOUT';
          const isStderr = event.kind === 'KIND_STDERR';
          const isCompile = event.kind === 'KIND_COMPILE';

          // Split message into lines for line numbering
          const lines = event.message.split('\n');

          return (
            <div key={index} className="mb-2">
              {isCompile && (
                <div className="text-blue-400 text-sm mb-1">
                  <span className="font-medium">Compilation:</span> <AnsiText>{event.message}</AnsiText>
                </div>
              )}
              {isStdout && (
                <div className="flex">
                  {showLineNumbers && (
                    <div className="flex-shrink-0 pr-4 text-gray-600 text-sm font-mono select-none border-r border-gray-800 mr-4">
                      {lines.map((_, lineIdx) => (
                        <div key={lineIdx} className="text-right" style={{ minWidth: '2.5rem' }}>
                          {index + lineIdx + 1}
                        </div>
                      ))}
                    </div>
                  )}
                  <pre className="text-gray-200 text-sm font-mono whitespace-pre-wrap flex-1">
                    <AnsiText>{event.message}</AnsiText>
                  </pre>
                </div>
              )}
              {isStderr && (
                <div className="flex">
                  {showLineNumbers && (
                    <div className="flex-shrink-0 pr-4 text-gray-600 text-sm font-mono select-none border-r border-gray-800 mr-4">
                      {lines.map((_, lineIdx) => (
                        <div key={lineIdx} className="text-right" style={{ minWidth: '2.5rem' }}>
                          {index + lineIdx + 1}
                        </div>
                      ))}
                    </div>
                  )}
                  <pre className="text-red-400 text-sm font-mono whitespace-pre-wrap flex-1">
                    <AnsiText>{event.message}</AnsiText>
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
