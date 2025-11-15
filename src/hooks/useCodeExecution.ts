/**
 * Custom hook for executing code.
 * Handles regular, streaming (SSE), and WebSocket execution modes.
 */

import { useState, useCallback } from 'react';
import { executionAPI, ExecuteResponse, Language } from '@/lib/api';
import { extractErrorMessage } from '@/lib/guards';
import { useWebSocket } from '@/hooks/useWebSocket';
import { ExecutionEvent as WSExecutionEvent } from '@/lib/websocket/protocol';

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
  wsConnected: boolean;
  wsConnecting: boolean;
  wsReconnecting: boolean;
  execute: (code: string, language: string, languages: Language[]) => Promise<void>;
  executeStream: (code: string, language: string, languages: Language[]) => Promise<void>;
  executeWebSocket: (code: string, language: string, languages: Language[]) => Promise<void>;
  reset: () => void;
}

export function useCodeExecution(): UseCodeExecutionReturn {
  const [output, setOutput] = useState<ExecuteResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [streaming, setStreaming] = useState<boolean>(false);
  const [streamEvents, setStreamEvents] = useState<ExecutionEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  // WebSocket configuration
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  const WS_URL = API_URL.replace('http', 'ws') + '/api/v1/ws';

  // WebSocket hook
  const {
    connected: wsConnected,
    connecting: wsConnecting,
    reconnecting: wsReconnecting,
    execute: wsExecute,
  } = useWebSocket({
    url: WS_URL,
    enabled: true,
    onExecutionEvent: (event: WSExecutionEvent) => {
      // Convert WebSocket event to ExecutionEvent format
      setStreamEvents((prev) => [...prev, {
        type: event.type,
        message: event.message,
        timestamp: event.timestamp,
      }]);
    },
    onError: (errorResponse) => {
      setError(errorResponse.message);
      setStreaming(false);
    },
  });

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
        setError('Language not found');
        setLoading(false);
        return;
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
    } catch (err: unknown) {
      console.error('Execution failed:', err);
      setError(extractErrorMessage(err));
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
        setError('Language not found');
        setStreaming(false);
        return;
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
        setError('Stream failed to start');
        setStreaming(false);
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        setError('No reader available');
        setStreaming(false);
        return;
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
    } catch (err: unknown) {
      console.error('Stream execution failed:', err);
      setError(extractErrorMessage(err));
    } finally {
      setStreaming(false);
    }
  }, []);

  const executeWebSocket = useCallback(async (
    code: string,
    language: string,
    languages: Language[]
  ) => {
    if (!code.trim()) {
      setError('Please write some code first');
      return;
    }

    if (!wsConnected) {
      setError('WebSocket not connected');
      return;
    }

    setStreaming(true);
    setStreamEvents([]);
    setOutput(null);
    setError(null);

    try {
      const lang = languages.find(l => l.id === language);
      if (!lang) {
        setError('Language not found');
        setStreaming(false);
        return;
      }

      const extension = lang.extensions[0] || '.txt';
      const filename = `main${extension}`;

      // Execute via WebSocket
      const requestId = await wsExecute({
        language,
        files: {
          [filename]: code,
        },
      });

      if (!requestId) {
        setError('Failed to execute via WebSocket');
        setStreaming(false);
      }
    } catch (err: unknown) {
      console.error('WebSocket execution failed:', err);
      setError(extractErrorMessage(err));
      setStreaming(false);
    }
  }, [wsConnected, wsExecute]);

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
    wsConnected,
    wsConnecting,
    wsReconnecting,
    execute,
    executeStream,
    executeWebSocket,
    reset,
  };
}
