/**
 * gRPC-Web Clients
 * 
 * This module provides gRPC-Web client instances for all backend services.
 * Uses the generated TypeScript code from proto definitions.
 */

import { LanguageServiceClient } from './generated/language/v1/LanguageServiceClientPb';
import { ExecutionServiceClient } from './generated/execution/v1/ExecutionServiceClientPb';
import { StorageServiceClient } from './generated/storage/v1/StorageServiceClientPb';
import { AuthServiceClient } from './generated/auth/v1/AuthServiceClientPb';

// Gateway endpoint for gRPC-Web
const GRPC_WEB_ENDPOINT = process.env.NEXT_PUBLIC_GRPC_ENDPOINT || 'http://localhost:8080/grpc';

// Create client instances
export const languageClient = new LanguageServiceClient(GRPC_WEB_ENDPOINT);
export const executionClient = new ExecutionServiceClient(GRPC_WEB_ENDPOINT);
export const storageClient = new StorageServiceClient(GRPC_WEB_ENDPOINT);
export const authClient = new AuthServiceClient(GRPC_WEB_ENDPOINT);

// Export types for convenience
export * from './generated/language/v1/language_pb';
export * from './generated/execution/v1/execution_pb';
export * from './generated/storage/v1/storage_pb';
export * from './generated/auth/v1/auth_pb';

export default {
  languageClient,
  executionClient,
  storageClient,
  authClient,
};
