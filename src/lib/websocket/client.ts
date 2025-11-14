/**
 * WebSocket client with automatic reconnection and heartbeat.
 */

import {
  WebSocketMessage,
  parseMessage,
  createPingMessage,
  ExecutionEvent,
  ErrorResponse,
  ServerMessageType,
} from './protocol';

export interface WebSocketClientOptions {
  url: string;
  reconnectDelay?: number;
  maxReconnectDelay?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (error: Event) => void;
  onMessage?: (message: WebSocketMessage) => void;
  onReconnecting?: (attempt: number) => void;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private reconnectDelay: number;
  private maxReconnectDelay: number;
  private maxReconnectAttempts: number;
  private heartbeatInterval: number;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private intentionallyClosed = false;

  // Event handlers
  private onOpen?: () => void;
  private onClose?: (event: CloseEvent) => void;
  private onError?: (error: Event) => void;
  private onMessage?: (message: WebSocketMessage) => void;
  private onReconnecting?: (attempt: number) => void;

  // Message handlers by type
  private messageHandlers: Map<ServerMessageType, ((message: WebSocketMessage) => void)[]> = new Map();

  constructor(options: WebSocketClientOptions) {
    this.url = options.url;
    this.reconnectDelay = options.reconnectDelay || 1000;
    this.maxReconnectDelay = options.maxReconnectDelay || 30000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    this.heartbeatInterval = options.heartbeatInterval || 30000;

    this.onOpen = options.onOpen;
    this.onClose = options.onClose;
    this.onError = options.onError;
    this.onMessage = options.onMessage;
    this.onReconnecting = options.onReconnecting;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('[WebSocket] Connected');
          this.reconnectAttempts = 0;
          this.intentionallyClosed = false;
          this.startHeartbeat();
          this.onOpen?.();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = parseMessage(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('[WebSocket] Failed to parse message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[WebSocket] Error:', error);
          this.onError?.(error);
          reject(error);
        };

        this.ws.onclose = (event) => {
          console.log('[WebSocket] Disconnected:', event.code, event.reason);
          this.stopHeartbeat();
          this.onClose?.(event);

          if (!this.intentionallyClosed) {
            this.scheduleReconnect();
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.intentionallyClosed = true;
    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  /**
   * Send message to server
   */
  send(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('[WebSocket] Cannot send message, not connected');
      throw new Error('WebSocket not connected');
    }
  }

  /**
   * Register a handler for a specific message type
   */
  on(type: ServerMessageType, handler: (message: WebSocketMessage) => void): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)!.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: WebSocketMessage): void {
    // Call global message handler
    this.onMessage?.(message);

    // Call type-specific handlers
    const handlers = this.messageHandlers.get(message.type as ServerMessageType);
    if (handlers) {
      handlers.forEach(handler => handler(message));
    }
  }

  /**
   * Start heartbeat (ping/pong)
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        try {
          this.send(createPingMessage());
        } catch (error) {
          console.error('[WebSocket] Failed to send ping:', error);
        }
      }
    }, this.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;

    // Exponential backoff with jitter
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );
    const jitter = Math.random() * 1000;

    console.log(
      `[WebSocket] Reconnecting in ${delay + jitter}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    this.onReconnecting?.(this.reconnectAttempts);

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(error => {
        console.error('[WebSocket] Reconnection failed:', error);
      });
    }, delay + jitter);
  }
}

/**
 * Helper function to create a WebSocket client for code execution
 */
export function createExecutionWebSocket(
  baseUrl: string,
  onExecutionEvent?: (event: ExecutionEvent) => void,
  onError?: (error: ErrorResponse) => void
): WebSocketClient {
  const wsUrl = baseUrl.replace('http', 'ws') + '/api/v1/ws';

  const client = new WebSocketClient({
    url: wsUrl,
    onOpen: () => console.log('[WebSocket] Connection established'),
    onClose: (event) => console.log('[WebSocket] Connection closed:', event.code),
    onError: (error) => console.error('[WebSocket] Connection error:', error),
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

  return client;
}
