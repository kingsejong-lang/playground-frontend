/**
 * SSE (Server-Sent Events) client with automatic reconnection and exponential backoff.
 * Provides robust streaming capabilities with connection management.
 */

import { getCsrfToken } from './api';

export type SSEConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';

export interface SSEEvent {
  type: string;
  message: string;
  timestamp: string;
}

export interface SSEClientConfig {
  url: string;
  requestBody: unknown;
  maxRetries?: number;
  initialRetryDelay?: number;
  maxRetryDelay?: number;
  onEvent?: (event: SSEEvent) => void;
  onStateChange?: (state: SSEConnectionState) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

/**
 * SSE Client with automatic reconnection
 */
export class SSEClient {
  private config: Required<SSEClientConfig>;
  private state: SSEConnectionState = 'idle';
  private retryCount = 0;
  private retryTimeout: NodeJS.Timeout | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private abortController: AbortController | null = null;
  private isManualDisconnect = false;

  constructor(config: SSEClientConfig) {
    this.config = {
      maxRetries: config.maxRetries ?? 5,
      initialRetryDelay: config.initialRetryDelay ?? 1000,
      maxRetryDelay: config.maxRetryDelay ?? 30000,
      onEvent: config.onEvent ?? (() => {}),
      onStateChange: config.onStateChange ?? (() => {}),
      onError: config.onError ?? (() => {}),
      onComplete: config.onComplete ?? (() => {}),
      url: config.url,
      requestBody: config.requestBody,
    };
  }

  /**
   * Connect to SSE endpoint
   */
  async connect(): Promise<void> {
    this.isManualDisconnect = false;
    await this.connectInternal();
  }

  /**
   * Internal connection logic
   */
  private async connectInternal(): Promise<void> {
    if (this.isManualDisconnect) {
      return;
    }

    try {
      const isReconnect = this.retryCount > 0;
      this.setState(isReconnect ? 'reconnecting' : 'connecting');

      // Create new AbortController for this connection
      this.abortController = new AbortController();

      // Get CSRF token
      const csrfToken = await getCsrfToken();

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const response = await fetch(`${API_URL}${this.config.url}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include', // Include httpOnly cookies
        body: JSON.stringify(this.config.requestBody),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`SSE connection failed: ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      this.setState('connected');
      this.retryCount = 0; // Reset retry count on successful connection
      this.reader = response.body.getReader();
      await this.readStream();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Connection was manually aborted, don't retry
        return;
      }

      this.handleConnectionError(error as Error);
    }
  }

  /**
   * Read SSE stream
   */
  private async readStream(): Promise<void> {
    if (!this.reader) {
      return;
    }

    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await this.reader.read();

        if (done) {
          this.config.onComplete();
          this.setState('disconnected');
          this.scheduleReconnect();
          break;
        }

        const chunk = decoder.decode(value);
        this.processChunk(chunk);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Stream was manually aborted
        return;
      }

      this.handleConnectionError(error as Error);
    }
  }

  /**
   * Process SSE chunk
   */
  private processChunk(chunk: string): void {
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data:')) {
        try {
          const data = JSON.parse(line.substring(5).trim());

          // Validate event structure
          if (this.isValidSSEEvent(data)) {
            this.config.onEvent(data);
          }
        } catch (error) {
          console.error('Failed to parse SSE data:', error, 'Line:', line);
        }
      }
    }
  }

  /**
   * Type guard for SSE events
   */
  private isValidSSEEvent(data: unknown): data is SSEEvent {
    return (
      typeof data === 'object' &&
      data !== null &&
      'type' in data &&
      'message' in data &&
      'timestamp' in data &&
      typeof (data as SSEEvent).type === 'string' &&
      typeof (data as SSEEvent).message === 'string' &&
      typeof (data as SSEEvent).timestamp === 'string'
    );
  }

  /**
   * Handle connection errors
   */
  private handleConnectionError(error: Error): void {
    this.setState('error');
    this.config.onError(error);
    this.scheduleReconnect();
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.isManualDisconnect) {
      return;
    }

    if (this.retryCount >= this.config.maxRetries) {
      this.setState('disconnected');
      this.config.onError(new Error(`Max retries (${this.config.maxRetries}) reached`));
      return;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.config.initialRetryDelay * Math.pow(2, this.retryCount),
      this.config.maxRetryDelay
    );

    this.retryCount++;

    this.retryTimeout = setTimeout(() => {
      this.connectInternal();
    }, delay);
  }

  /**
   * Disconnect from SSE
   */
  disconnect(): void {
    this.isManualDisconnect = true;

    // Clear retry timeout
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    // Cancel ongoing fetch
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    // Cancel stream reading
    if (this.reader) {
      this.reader.cancel();
      this.reader = null;
    }

    this.setState('disconnected');
    this.retryCount = 0;
  }

  /**
   * Update connection state
   */
  private setState(newState: SSEConnectionState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.config.onStateChange(newState);
    }
  }

  /**
   * Get current connection state
   */
  getState(): SSEConnectionState {
    return this.state;
  }

  /**
   * Get current retry count
   */
  getRetryCount(): number {
    return this.retryCount;
  }
}
