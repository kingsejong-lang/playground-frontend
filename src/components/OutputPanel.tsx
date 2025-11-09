'use client';

import { ExecuteResponse } from '@/lib/api';

interface OutputPanelProps {
  output: ExecuteResponse | null;
  loading: boolean;
  error: string | null;
  streaming?: boolean;
  streamEvents?: Array<{type: string; message: string; timestamp: string}>;
}

export default function OutputPanel({ output, loading, error, streaming, streamEvents }: OutputPanelProps) {
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
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
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
      </div>

      {/* Output */}
      <div className="flex-1 overflow-auto p-4">
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

          return (
            <div key={index} className="mb-2">
              {isCompile && (
                <div className="text-blue-400 text-sm mb-1">
                  <span className="font-medium">Compilation:</span> {event.message}
                </div>
              )}
              {isStdout && (
                <pre className="text-gray-200 text-sm font-mono whitespace-pre-wrap">{event.message}</pre>
              )}
              {isStderr && (
                <pre className="text-red-400 text-sm font-mono whitespace-pre-wrap">{event.message}</pre>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
