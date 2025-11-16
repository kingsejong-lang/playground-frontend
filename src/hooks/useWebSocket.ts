/**
 * React hook for WebSocket connection management.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { WebSocketClient } from '@/lib/websocket/client';
import {
  ExecuteRequest,
  ExecutionEvent,
  ErrorResponse,
  createExecuteMessage,
  createCancelMessage,
} from '@/lib/websocket/protocol';

export interface UseWebSocketOptions {
  url: string;
  enabled?: boolean;
  onExecutionEvent?: (event: ExecutionEvent) => void;
  onError?: (error: ErrorResponse) => void;
  onReconnecting?: (attempt: number) => void;
}

export interface UseWebSocketReturn {
  connected: boolean;
  connecting: boolean;
  reconnecting: boolean;
  execute: (request: ExecuteRequest) => Promise<string>;
  cancel: (requestId: string) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
}

/**
 * Hook for managing WebSocket connection
 */
export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const {
    url,
    enabled = true,
    onExecutionEvent,
    onError,
    onReconnecting,
  } = options;

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  const clientRef = useRef<WebSocketClient | null>(null);
  const requestCounterRef = useRef(0);

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(async () => {
    if (clientRef.current?.isConnected()) {
      return;
    }

    setConnecting(true);

    try {
      // Create client if not exists
      if (!clientRef.current) {
        const client = new WebSocketClient({
          url,
          onOpen: () => {
            setConnected(true);
            setConnecting(false);
            setReconnecting(false);
          },
          onClose: () => {
            setConnected(false);
            setConnecting(false);
          },
          onError: (error) => {
            console.error('[WebSocket Hook] Error:', error);
            setConnecting(false);
          },
          onReconnecting: (attempt) => {
            setReconnecting(true);
            onReconnecting?.(attempt);
          },
        });

        // Register execution event handlers
        client.on('execution_started', (message) => {
          onExecutionEvent?.(message.data as ExecutionEvent);
        });

        client.on('execution_output', (message) => {
          onExecutionEvent?.(message.data as ExecutionEvent);
        });

        client.on('execution_progress', (message) => {
          onExecutionEvent?.(message.data as ExecutionEvent);
        });

        client.on('execution_completed', (message) => {
          onExecutionEvent?.(message.data as ExecutionEvent);
        });

        client.on('execution_failed', (message) => {
          onExecutionEvent?.(message.data as ExecutionEvent);
        });

        client.on('error', (message) => {
          onError?.(message.data as ErrorResponse);
        });

        clientRef.current = client;
      }

      await clientRef.current.connect();
    } catch (error) {
      console.error('[WebSocket Hook] Connection failed:', error);
      setConnecting(false);
      throw error;
    }
  }, [url, onExecutionEvent, onError, onReconnecting]);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      setConnected(false);
      setConnecting(false);
      setReconnecting(false);
    }
  }, []);

  /**
   * Execute code via WebSocket
   * @returns requestId on success, empty string on failure
   */
  const execute = useCallback(async (request: ExecuteRequest): Promise<string> => {
    if (!clientRef.current?.isConnected()) {
      console.error('[WebSocket Hook] Cannot execute, not connected');
      return '';
    }

    // Generate unique request ID
    requestCounterRef.current += 1;
    const requestId = `req_${Date.now()}_${requestCounterRef.current}`;

    try {
      const message = createExecuteMessage(requestId, request);
      clientRef.current.send(message);
      return requestId;
    } catch (error) {
      console.error('[WebSocket Hook] Execute failed:', error);
      return '';
    }
  }, []);

  /**
   * Cancel execution
   */
  const cancel = useCallback((requestId: string) => {
    if (!clientRef.current?.isConnected()) {
      console.warn('[WebSocket Hook] Cannot cancel, not connected');
      return;
    }

    try {
      const message = createCancelMessage(requestId);
      clientRef.current.send(message);
    } catch (error) {
      console.error('[WebSocket Hook] Cancel failed:', error);
    }
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    let shouldConnect = enabled;

    if (shouldConnect) {
      connect().catch(error => {
        console.error('[WebSocket Hook] Auto-connect failed:', error);
      });
    }

    // Cleanup on unmount or when enabled changes to false
    return () => {
      disconnect();
    };
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps
  // Note: connect/disconnect are intentionally excluded to prevent reconnection loops
  // caused by callback recreation in parent components

  return {
    connected,
    connecting,
    reconnecting,
    execute,
    cancel,
    connect,
    disconnect,
  };
}
