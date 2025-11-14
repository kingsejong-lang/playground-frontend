/**
 * WebSocket protocol types and interfaces.
 * Based on backend protocol in services/gateway/internal/websocket/protocol.go
 */

// Client -> Server message types
export type ClientMessageType =
  | 'execute'
  | 'cancel'
  | 'subscribe'
  | 'unsubscribe'
  | 'ping';

// Server -> Client message types
export type ServerMessageType =
  | 'execution_started'
  | 'execution_output'
  | 'execution_completed'
  | 'execution_failed'
  | 'execution_progress'
  | 'error'
  | 'pong';

export type MessageType = ClientMessageType | ServerMessageType;

/**
 * WebSocket message structure
 */
export interface WebSocketMessage<T = any> {
  type: MessageType;
  request_id?: string;
  data?: T;
  timestamp: string;
}

/**
 * Execute request payload
 */
export interface ExecuteRequest {
  language: string;
  files: Record<string, string>;
  args?: string;
  stdin?: string;
  timeout_seconds?: number;
}

/**
 * Execution event payload
 */
export interface ExecutionEvent {
  type: string;
  message: string;
  data?: Record<string, any>;
  timestamp: string;
}

/**
 * Error response payload
 */
export interface ErrorResponse {
  code: string;
  message: string;
  details?: string;
}

/**
 * Create a client message
 */
export function createMessage<T = any>(
  type: ClientMessageType,
  requestId?: string,
  data?: T
): WebSocketMessage<T> {
  return {
    type,
    request_id: requestId,
    data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Parse incoming message
 */
export function parseMessage(data: string): WebSocketMessage {
  return JSON.parse(data);
}

/**
 * Create execute message
 */
export function createExecuteMessage(
  requestId: string,
  request: ExecuteRequest
): WebSocketMessage<ExecuteRequest> {
  return createMessage('execute', requestId, request);
}

/**
 * Create cancel message
 */
export function createCancelMessage(requestId: string): WebSocketMessage {
  return createMessage('cancel', requestId);
}

/**
 * Create ping message
 */
export function createPingMessage(): WebSocketMessage {
  return createMessage('ping');
}
