'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { ExecuteResponse } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { AnsiText, stripAnsi } from '@/lib/ansi-parser';
import { OutputToolbarButton, Icons } from '@/components/ui/OutputToolbarButton';

interface StreamEvent {
  type: string;
  message: string;
  timestamp: string;
}

interface OutputPanelProps {
  output: ExecuteResponse | null;
  loading: boolean;
  error: string | null;
  streaming?: boolean;
  streamEvents?: StreamEvent[];
  onClear?: () => void;
}

/**
 * OutputPanel - Displays code execution results
 */
export default function OutputPanel({
  output,
  loading,
  error,
  streaming,
  streamEvents,
  onClear,
}: OutputPanelProps) {
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

  // Extract all text content for copy/download (strip ANSI codes)
  const getOutputText = useCallback((): string => {
    if (error) return stripAnsi(error);

    if (streaming && streamEvents) {
      return streamEvents.map((e) => stripAnsi(`[${e.type}] ${e.message}`)).join('\n');
    }

    if (!output) return '';

    const lines: string[] = [];

    if (output.error) {
      lines.push(`Error: ${output.error.code}`);
      lines.push(stripAnsi(output.error.message));
      if (output.error.details) lines.push(stripAnsi(output.error.details));
    }

    output.events.forEach((event) => {
      if (event.kind === 'KIND_COMPILE') {
        lines.push(stripAnsi(`[Compilation] ${event.message}`));
      } else {
        lines.push(stripAnsi(event.message));
      }
    });

    return lines.join('\n');
  }, [error, streaming, streamEvents, output]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      const text = getOutputText();
      if (!text) {
        toast.warning('No output to copy');
        return;
      }
      await navigator.clipboard.writeText(text);
      toast.success('Output copied to clipboard');
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  }, [getOutputText, toast]);

  // Download as text file
  const handleDownload = useCallback(() => {
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
  }, [getOutputText, toast]);

  // Loading/Streaming state
  if (loading || streaming) {
    return (
      <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--output-zone)' }}>
        <div
          className="flex items-center gap-2 px-4 py-2"
          style={{ borderBottom: '1px solid var(--border-hair)' }}
        >
          <div
            className="animate-spin rounded-full h-4 w-4"
            style={{ borderBottom: '2px solid var(--accent-indigo)' }}
          />
          <span className="text-sm" style={{ color: 'var(--text-whisper)' }}>
            {streaming ? 'Streaming execution...' : 'Executing code...'}
          </span>
        </div>
        {streaming && streamEvents && streamEvents.length > 0 && (
          <div className="flex-1 overflow-auto p-4">
            {streamEvents.map((event, index) => (
              <StreamEventItem key={index} event={event} />
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

  // Error state
  if (error) {
    return (
      <div className="h-full p-4 overflow-auto" style={{ backgroundColor: 'var(--output-zone)' }}>
        <ErrorBox message={error} />
      </div>
    );
  }

  // Show completed stream events if available
  if (!output && streamEvents && streamEvents.length > 0) {
    return (
      <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--output-zone)' }}>
        <OutputHeader success onCopy={handleCopy} onDownload={handleDownload} onClear={onClear} />
        <div ref={outputRef} className="flex-1 overflow-auto p-4">
          {streamEvents.map((event, index) => (
            <StreamEventItem key={index} event={event} />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (!output) {
    return (
      <div
        className="h-full flex items-center justify-center"
        style={{ backgroundColor: 'var(--output-zone)', color: 'var(--text-whisper)' }}
      >
        <div className="text-center">
          {Icons.empty}
          <p>Run your code to see output</p>
        </div>
      </div>
    );
  }

  // Output with results
  return (
    <div className="h-full flex flex-col">
      {/* Header with toolbar */}
      <div style={{ borderBottom: '1px solid var(--border-hair)' }}>
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-4">
            <span
              className="text-sm font-medium"
              style={{ color: output.success ? 'var(--accent-green)' : 'var(--accent-crimson)' }}
            >
              {output.success ? '✓ Success' : '✗ Failed'}
            </span>
            {output.metrics && <OutputMetrics metrics={output.metrics} />}
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2">
            <OutputToolbarButton
              icon={Icons.search}
              onClick={() => setShowSearch(!showSearch)}
              title="Search (Ctrl+F)"
              aria-label="Toggle search"
            />
            <OutputToolbarButton
              icon={Icons.lineNumbers}
              active={showLineNumbers}
              onClick={() => setShowLineNumbers(!showLineNumbers)}
              title="Toggle line numbers"
              aria-label="Toggle line numbers"
            />
            <OutputToolbarButton
              icon={Icons.autoScroll}
              active={autoScroll}
              onClick={() => setAutoScroll(!autoScroll)}
              title="Toggle auto-scroll"
              aria-label="Toggle auto-scroll"
            />
            <OutputToolbarButton
              icon={Icons.copy}
              onClick={handleCopy}
              title="Copy output"
              aria-label="Copy output to clipboard"
            />
            <OutputToolbarButton
              icon={Icons.download}
              onClick={handleDownload}
              title="Download output"
              aria-label="Download output as text file"
            />
            {onClear && (
              <OutputToolbarButton
                icon={Icons.clear}
                onClick={onClear}
                title="Clear output"
                aria-label="Clear output"
              />
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
                color: 'var(--text-primary)',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-indigo)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-hair)')}
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Output */}
      <div ref={outputRef} className="flex-1 overflow-auto p-4">
        {output.error && <OutputError error={output.error} />}

        {output.events.map((event, index) => (
          <OutputEvent key={index} event={event} index={index} showLineNumbers={showLineNumbers} />
        ))}
      </div>
    </div>
  );
}

// Sub-components

interface StreamEventItemProps {
  event: StreamEvent;
}

function StreamEventItem({ event }: StreamEventItemProps) {
  return (
    <div className="mb-2">
      <div className="text-xs mb-1" style={{ color: 'var(--text-whisper)' }}>
        [{event.type}] {new Date(event.timestamp).toLocaleTimeString()}
      </div>
      <pre className="text-sm font-mono whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
        {event.message}
      </pre>
    </div>
  );
}

interface ErrorBoxProps {
  message: string;
  title?: string;
}

function ErrorBox({ message, title = 'Error' }: ErrorBoxProps) {
  return (
    <div
      className="rounded-lg p-4"
      style={{ backgroundColor: 'rgba(232, 69, 69, 0.1)', border: '1px solid var(--accent-crimson)' }}
    >
      <h3 className="font-semibold mb-2" style={{ color: 'var(--accent-crimson)' }}>
        {title}
      </h3>
      <pre className="text-sm whitespace-pre-wrap" style={{ color: 'var(--accent-crimson)', opacity: 0.9 }}>
        {message}
      </pre>
    </div>
  );
}

interface OutputHeaderProps {
  success: boolean;
  onCopy: () => void;
  onDownload: () => void;
  onClear?: () => void;
}

function OutputHeader({ success, onCopy, onDownload, onClear }: OutputHeaderProps) {
  return (
    <div style={{ borderBottom: '1px solid var(--border-hair)' }}>
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-sm font-medium" style={{ color: 'var(--accent-green)' }}>
          ✓ Execution Completed
        </span>
        <div className="flex items-center gap-2">
          <OutputToolbarButton
            icon={Icons.copy}
            onClick={onCopy}
            title="Copy output"
            aria-label="Copy output to clipboard"
          />
          <OutputToolbarButton
            icon={Icons.download}
            onClick={onDownload}
            title="Download output"
            aria-label="Download output as text file"
          />
          {onClear && (
            <OutputToolbarButton
              icon={Icons.clear}
              onClick={onClear}
              title="Clear output"
              aria-label="Clear output"
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface OutputMetricsProps {
  metrics: { compile_time_ms: number; run_time_ms: number; memory_bytes: number };
}

function OutputMetrics({ metrics }: OutputMetricsProps) {
  return (
    <div className="flex gap-4 text-xs" style={{ color: 'var(--text-whisper)' }}>
      {metrics.compile_time_ms > 0 && <span>Compile: {metrics.compile_time_ms}ms</span>}
      <span>Run: {metrics.run_time_ms}ms</span>
      <span>Memory: {(metrics.memory_bytes / 1024 / 1024).toFixed(1)}MB</span>
    </div>
  );
}

interface OutputErrorProps {
  error: { code: string; message: string; details?: string };
}

function OutputError({ error }: OutputErrorProps) {
  return (
    <div
      className="rounded-lg p-4 mb-4"
      style={{ backgroundColor: 'rgba(232, 69, 69, 0.1)', border: '1px solid var(--accent-crimson)' }}
    >
      <h3 className="font-semibold mb-2" style={{ color: 'var(--accent-crimson)' }}>
        {error.code}
      </h3>
      <p className="text-sm mb-2" style={{ color: 'var(--accent-crimson)', opacity: 0.9 }}>
        {error.message}
      </p>
      {error.details && (
        <pre className="text-xs whitespace-pre-wrap" style={{ color: 'var(--accent-crimson)', opacity: 0.8 }}>
          {error.details}
        </pre>
      )}
    </div>
  );
}

interface OutputEventProps {
  event: { kind: string; message: string };
  index: number;
  showLineNumbers: boolean;
}

function OutputEvent({ event, index, showLineNumbers }: OutputEventProps) {
  const isStdout = event.kind === 'KIND_STDOUT';
  const isStderr = event.kind === 'KIND_STDERR';
  const isCompile = event.kind === 'KIND_COMPILE';
  const lines = event.message.split('\n');

  if (isCompile) {
    return (
      <div className="mb-2">
        <div className="text-sm mb-1" style={{ color: 'var(--accent-indigo)' }}>
          <span className="font-medium">Compilation:</span> <AnsiText>{event.message}</AnsiText>
        </div>
      </div>
    );
  }

  if (isStdout || isStderr) {
    const color = isStdout ? 'var(--text-primary)' : 'var(--accent-crimson)';

    return (
      <div className="mb-2">
        <div className="flex">
          {showLineNumbers && <LineNumbers lines={lines} startIndex={index} />}
          <pre className="text-sm font-mono whitespace-pre-wrap flex-1" style={{ color }}>
            <AnsiText>{event.message}</AnsiText>
          </pre>
        </div>
      </div>
    );
  }

  return null;
}

interface LineNumbersProps {
  lines: string[];
  startIndex: number;
}

function LineNumbers({ lines, startIndex }: LineNumbersProps) {
  return (
    <div
      className="flex-shrink-0 pr-4 text-sm font-mono select-none mr-4"
      style={{ color: 'var(--text-whisper)', borderRight: '1px solid var(--border-hair)' }}
    >
      {lines.map((_, lineIdx) => (
        <div key={lineIdx} className="text-right" style={{ minWidth: '2.5rem' }}>
          {startIndex + lineIdx + 1}
        </div>
      ))}
    </div>
  );
}
