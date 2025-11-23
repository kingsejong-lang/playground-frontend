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
      <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--output-zone)' }}>
        <div className="flex items-center gap-2 px-4 py-2" style={{ borderBottom: '1px solid var(--border-hair)' }}>
          <div className="animate-spin rounded-full h-4 w-4" style={{ borderBottom: '2px solid var(--accent-indigo)' }}></div>
          <span className="text-sm" style={{ color: 'var(--text-whisper)' }}>{streaming ? 'Streaming execution...' : 'Executing code...'}</span>
        </div>
        {streaming && streamEvents && streamEvents.length > 0 && (
          <div className="flex-1 overflow-auto p-4">
            {streamEvents.map((event, index) => (
              <div key={index} className="mb-2">
                <div className="text-xs mb-1" style={{ color: 'var(--text-whisper)' }}>
                  [{event.type}] {new Date(event.timestamp).toLocaleTimeString()}
                </div>
                <pre className="text-sm font-mono whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{event.message}</pre>
              </div>
            ))}
          </div>
        )}
        {!streaming && !streamEvents?.length && (
          <div className="flex-1 flex items-center justify-center">
            <p style={{ color: 'var(--text-whisper)' }}>Executing code...</p>
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full p-4 overflow-auto" style={{ backgroundColor: 'var(--output-zone)' }}>
        <div className="rounded-lg p-4" style={{ backgroundColor: 'rgba(232, 69, 69, 0.1)', border: '1px solid var(--accent-crimson)' }}>
          <h3 className="font-semibold mb-2" style={{ color: 'var(--accent-crimson)' }}>Error</h3>
          <pre className="text-sm whitespace-pre-wrap" style={{ color: 'var(--accent-crimson)', opacity: 0.9 }}>{error}</pre>
        </div>
      </div>
    );
  }

  // Show completed stream events if available
  if (!output && streamEvents && streamEvents.length > 0) {
    return (
      <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--output-zone)' }}>
        <div style={{ borderBottom: '1px solid var(--border-hair)' }}>
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-sm font-medium" style={{ color: 'var(--accent-green)' }}>✓ Execution Completed</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="p-1.5 rounded transition-colors"
                style={{ color: 'var(--text-whisper)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.backgroundColor = 'var(--border-hair)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-whisper)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                title="Copy output"
                aria-label="Copy output to clipboard"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                onClick={handleDownload}
                className="p-1.5 rounded transition-colors"
                style={{ color: 'var(--text-whisper)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.backgroundColor = 'var(--border-hair)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-whisper)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
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
                  className="p-1.5 rounded transition-colors"
                  style={{ color: 'var(--text-whisper)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--text-primary)';
                    e.currentTarget.style.backgroundColor = 'var(--border-hair)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-whisper)';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
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
        </div>
        <div ref={outputRef} className="flex-1 overflow-auto p-4">
          {streamEvents.map((event, index) => (
            <div key={index} className="mb-2">
              <div className="text-xs mb-1" style={{ color: 'var(--text-whisper)' }}>
                [{event.type}] {new Date(event.timestamp).toLocaleTimeString()}
              </div>
              <pre className="text-sm font-mono whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{event.message}</pre>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!output) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: 'var(--output-zone)', color: 'var(--text-whisper)' }}>
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
    <div className="h-full flex flex-col">
      {/* Header with toolbar */}
      <div style={{ borderBottom: '1px solid var(--border-hair)' }}>
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium" style={{ color: output.success ? 'var(--accent-green)' : 'var(--accent-crimson)' }}>
              {output.success ? '✓ Success' : '✗ Failed'}
            </span>
            {output.metrics && (
              <div className="flex gap-4 text-xs" style={{ color: 'var(--text-whisper)' }}>
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
              className="p-1.5 rounded transition-colors"
              style={{ color: 'var(--text-whisper)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.backgroundColor = 'var(--border-hair)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-whisper)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="Search (Ctrl+F)"
              aria-label="Toggle search"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            <button
              onClick={() => setShowLineNumbers(!showLineNumbers)}
              className="p-1.5 rounded transition-colors"
              style={{
                color: showLineNumbers ? 'var(--accent-indigo)' : 'var(--text-whisper)',
                backgroundColor: showLineNumbers ? 'rgba(76, 95, 213, 0.1)' : 'transparent'
              }}
              onMouseEnter={(e) => {
                if (!showLineNumbers) {
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.backgroundColor = 'var(--border-hair)';
                }
              }}
              onMouseLeave={(e) => {
                if (!showLineNumbers) {
                  e.currentTarget.style.color = 'var(--text-whisper)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
              title="Toggle line numbers"
              aria-label="Toggle line numbers"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className="p-1.5 rounded transition-colors"
              style={{
                color: autoScroll ? 'var(--accent-indigo)' : 'var(--text-whisper)',
                backgroundColor: autoScroll ? 'rgba(76, 95, 213, 0.1)' : 'transparent'
              }}
              onMouseEnter={(e) => {
                if (!autoScroll) {
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.backgroundColor = 'var(--border-hair)';
                }
              }}
              onMouseLeave={(e) => {
                if (!autoScroll) {
                  e.currentTarget.style.color = 'var(--text-whisper)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
              title="Toggle auto-scroll"
              aria-label="Toggle auto-scroll"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>

            <button
              onClick={handleCopy}
              className="p-1.5 rounded transition-colors"
              style={{ color: 'var(--text-whisper)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.backgroundColor = 'var(--border-hair)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-whisper)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="Copy output"
              aria-label="Copy output to clipboard"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>

            <button
              onClick={handleDownload}
              className="p-1.5 rounded transition-colors"
              style={{ color: 'var(--text-whisper)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.backgroundColor = 'var(--border-hair)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-whisper)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
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
                className="p-1.5 rounded transition-colors"
                style={{ color: 'var(--text-whisper)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.backgroundColor = 'var(--border-hair)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-whisper)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
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
              className="w-full px-3 py-1.5 rounded text-sm focus:outline-none"
              style={{
                backgroundColor: 'var(--editor-zone)',
                border: '1px solid var(--border-hair)',
                color: 'var(--text-primary)'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent-indigo)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-hair)'}
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Output */}
      <div ref={outputRef} className="flex-1 overflow-auto p-4">
        {output.error ? (
          <div className="rounded-lg p-4 mb-4" style={{ backgroundColor: 'rgba(232, 69, 69, 0.1)', border: '1px solid var(--accent-crimson)' }}>
            <h3 className="font-semibold mb-2" style={{ color: 'var(--accent-crimson)' }}>{output.error.code}</h3>
            <p className="text-sm mb-2" style={{ color: 'var(--accent-crimson)', opacity: 0.9 }}>{output.error.message}</p>
            {output.error.details && (
              <pre className="text-xs whitespace-pre-wrap" style={{ color: 'var(--accent-crimson)', opacity: 0.8 }}>{output.error.details}</pre>
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
                <div className="text-sm mb-1" style={{ color: 'var(--accent-indigo)' }}>
                  <span className="font-medium">Compilation:</span> <AnsiText>{event.message}</AnsiText>
                </div>
              )}
              {isStdout && (
                <div className="flex">
                  {showLineNumbers && (
                    <div className="flex-shrink-0 pr-4 text-sm font-mono select-none mr-4" style={{ color: 'var(--text-whisper)', borderRight: '1px solid var(--border-hair)' }}>
                      {lines.map((_, lineIdx) => (
                        <div key={lineIdx} className="text-right" style={{ minWidth: '2.5rem' }}>
                          {index + lineIdx + 1}
                        </div>
                      ))}
                    </div>
                  )}
                  <pre className="text-sm font-mono whitespace-pre-wrap flex-1" style={{ color: 'var(--text-primary)' }}>
                    <AnsiText>{event.message}</AnsiText>
                  </pre>
                </div>
              )}
              {isStderr && (
                <div className="flex">
                  {showLineNumbers && (
                    <div className="flex-shrink-0 pr-4 text-sm font-mono select-none mr-4" style={{ color: 'var(--text-whisper)', borderRight: '1px solid var(--border-hair)' }}>
                      {lines.map((_, lineIdx) => (
                        <div key={lineIdx} className="text-right" style={{ minWidth: '2.5rem' }}>
                          {index + lineIdx + 1}
                        </div>
                      ))}
                    </div>
                  )}
                  <pre className="text-sm font-mono whitespace-pre-wrap flex-1" style={{ color: 'var(--accent-crimson)' }}>
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
