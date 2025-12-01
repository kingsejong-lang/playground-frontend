/**
 * WebSocket module exports.
 * Provides WebSocket client and protocol types for real-time code execution.
 */

// Protocol types and interfaces
export {
  type ClientMessageType,
  type ServerMessageType,
  type MessageType,
  type WebSocketMessage,
  type ExecuteRequest,
  type ExecutionEvent,
  type ErrorResponse,
  createMessage,
  parseMessage,
  createExecuteMessage,
  createCancelMessage,
  createPingMessage,
} from './protocol';

// WebSocket client
export {
  WebSocketClient,
  createExecutionWebSocket,
  type WebSocketClientOptions,
} from './client';
