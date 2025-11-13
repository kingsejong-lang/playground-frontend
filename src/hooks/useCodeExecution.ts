/**
 * Custom hook for executing code.
 * Handles both regular and streaming execution modes.
 */

import { useState, useCallback } from 'react';
import { executionAPI, ExecuteResponse, Language } from '@/lib/api';

interface ExecutionEvent {
  type: string;
  message: string;
  timestamp: string;
}

interface UseCodeExecutionReturn {
  output: ExecuteResponse | null;
  loading: boolean;
  streaming: boolean;
  streamEvents: ExecutionEvent[];
  error: string | null;
  execute: (code: string, language: string, languages: Language[]) => Promise<void>;
  executeStream: (code: string, language: string, languages: Language[]) => Promise<void>;
  reset: () => void;
}

export function useCodeExecution(): UseCodeExecutionReturn {
  const [output, setOutput] = useState<ExecuteResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [streaming, setStreaming] = useState<boolean>(false);
  const [streamEvents, setStreamEvents] = useState<ExecutionEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (
    code: string,
    language: string,
    languages: Language[]
  ) => {
    if (!code.trim()) {
      setError('Please write some code first');
      return;
    }

    setLoading(true);
    setOutput(null);
    setError(null);

    try {
      const lang = languages.find(l => l.id === language);
      if (!lang) {
        throw new Error('Language not found');
      }

      // Determine filename based on language
      const extension = lang.extensions[0] || '.txt';
      const filename = `main${extension}`;

      const result = await executionAPI.execute({
        language,
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
  }, []);

  const executeStream = useCallback(async (
    code: string,
    language: string,
    languages: Language[]
  ) => {
    if (!code.trim()) {
      setError('Please write some code first');
      return;
    }

    setStreaming(true);
    setStreamEvents([]);
    setOutput(null);
    setError(null);

    try {
      const lang = languages.find(l => l.id === language);
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
          language,
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
  }, []);

  const reset = useCallback(() => {
    setOutput(null);
    setStreamEvents([]);
    setError(null);
  }, []);

  return {
    output,
    loading,
    streaming,
    streamEvents,
    error,
    execute,
    executeStream,
    reset,
  };
}
