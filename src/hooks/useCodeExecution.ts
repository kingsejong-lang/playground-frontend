/**
 * Custom hook for executing code.
 * Handles regular, streaming (SSE), and WebSocket execution modes.
 */

import { useState, useCallback } from 'react';
import { executionAPI, ExecuteResponse, Language } from '@/lib/api';
import { extractErrorMessage } from '@/lib/guards';
import { useWebSocket } from '@/hooks/useWebSocket';
import { ExecutionEvent as WSExecutionEvent } from '@/lib/websocket/protocol';
import { resolveLanguage, getMainFilename } from '@/lib/utils/language';

interface ExecutionEvent {
  type: string;
  message: string;
  timestamp: string;
}

interface UseCodeExecutionOptions {
  enableWebSocket?: boolean;
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

export function useCodeExecution(options?: UseCodeExecutionOptions): UseCodeExecutionReturn {
  const { enableWebSocket = false } = options || {};
  const [output, setOutput] = useState<ExecuteResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [streaming, setStreaming] = useState<boolean>(false);
  const [streamEvents, setStreamEvents] = useState<ExecutionEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  // WebSocket configuration
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  const WS_URL = API_URL.replace('http', 'ws') + '/api/v1/ws';

  // WebSocket hook (only enabled if option is set)
  const {
    connected: wsConnected,
    connecting: wsConnecting,
    reconnecting: wsReconnecting,
    execute: wsExecute,
  } = useWebSocket({
    url: WS_URL,
    enabled: enableWebSocket,
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
      const lang = resolveLanguage(language, languages);
      if (!lang) {
        setError('Language not found');
        setLoading(false);
        return;
      }

      const filename = getMainFilename(lang);
      const result = await executionAPI.execute({
        language,
        files: { [filename]: code },
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

    const lang = resolveLanguage(language, languages);
    if (!lang) {
      setError('Language not found');
      return;
    }

    setStreaming(true);
    setStreamEvents([]);
    setOutput(null);
    setError(null);

    const filename = getMainFilename(lang);
    const { SSEClient } = await import('@/lib/sse-client');

    const client = new SSEClient({
      url: '/api/v1/execute/stream',
      requestBody: {
        language,
        files: { [filename]: code },
      },
      maxRetries: 3,
      initialRetryDelay: 1000,
      maxRetryDelay: 10000,
      onEvent: (event) => setStreamEvents((prev) => [...prev, event]),
      onError: (err) => {
        console.error('SSE error:', err);
        setError(err.message);
      },
      onComplete: () => setStreaming(false),
    });

    await client.connect();
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
      const lang = resolveLanguage(language, languages);
      if (!lang) {
        setError('Language not found');
        setStreaming(false);
        return;
      }

      const filename = getMainFilename(lang);
      const requestId = await wsExecute({
        language,
        files: { [filename]: code },
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
