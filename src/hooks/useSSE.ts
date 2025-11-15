/**
 * React hook for SSE (Server-Sent Events) with automatic reconnection.
 * Provides a convenient way to consume SSE streams in React components.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { SSEClient, SSEConnectionState, SSEEvent } from '@/lib/sse-client';

export interface UseSSEConfig {
  url: string;
  requestBody: unknown;
  enabled?: boolean;
  maxRetries?: number;
  initialRetryDelay?: number;
  maxRetryDelay?: number;
  onEvent?: (event: SSEEvent) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export interface UseSSEReturn {
  state: SSEConnectionState;
  events: SSEEvent[];
  error: Error | null;
  retryCount: number;
  connect: () => void;
  disconnect: () => void;
  reset: () => void;
}

/**
 * Hook for SSE connections with automatic reconnection
 */
export function useSSE(config: UseSSEConfig): UseSSEReturn {
  const [state, setState] = useState<SSEConnectionState>('idle');
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const clientRef = useRef<SSEClient | null>(null);
  const configRef = useRef(config);

  // Update config ref when config changes
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Create event handler that updates state
  const handleEvent = useCallback((event: SSEEvent) => {
    setEvents((prev) => [...prev, event]);
    configRef.current.onEvent?.(event);
  }, []);

  // Create error handler
  const handleError = useCallback((err: Error) => {
    setError(err);
    configRef.current.onError?.(err);
  }, []);

  // Create state change handler
  const handleStateChange = useCallback((newState: SSEConnectionState) => {
    setState(newState);

    // Update retry count when state changes
    if (clientRef.current) {
      setRetryCount(clientRef.current.getRetryCount());
    }
  }, []);

  // Create complete handler
  const handleComplete = useCallback(() => {
    configRef.current.onComplete?.();
  }, []);

  // Connect function
  const connect = useCallback(() => {
    // Disconnect existing client if any
    if (clientRef.current) {
      clientRef.current.disconnect();
    }

    // Create new client
    const client = new SSEClient({
      url: configRef.current.url,
      requestBody: configRef.current.requestBody,
      maxRetries: configRef.current.maxRetries,
      initialRetryDelay: configRef.current.initialRetryDelay,
      maxRetryDelay: configRef.current.maxRetryDelay,
      onEvent: handleEvent,
      onStateChange: handleStateChange,
      onError: handleError,
      onComplete: handleComplete,
    });

    clientRef.current = client;
    client.connect();
  }, [handleEvent, handleStateChange, handleError, handleComplete]);

  // Disconnect function
  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }
  }, []);

  // Reset function
  const reset = useCallback(() => {
    setEvents([]);
    setError(null);
    setRetryCount(0);
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (config.enabled) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
    };
  }, [config.enabled, connect]);

  return {
    state,
    events,
    error,
    retryCount,
    connect,
    disconnect,
    reset,
  };
}
