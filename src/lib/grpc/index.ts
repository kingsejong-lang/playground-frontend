/**
 * gRPC-Web clients index
 * Central export point for all gRPC clients
 */

// Export execution client
export {
  GrpcExecutionClient,
  grpcExecutionClient,
  type ExecuteRequest,
  type ExecuteResponse,
  type ExecutionEvent,
  type ExecutionMetrics,
  type ExecutionError,
  type CancelRequest,
  type CancelResponse,
  type GetStatusRequest,
  type ExecutionStatus,
} from './clients/execution';

// Export language client
export {
  GrpcLanguageClient,
  grpcLanguageClient,
  type Language,
  type LanguageSpec,
  type EnvVar,
  type Template,
  type ListLanguagesRequest,
  type ListLanguagesResponse,
  type GetLanguageRequest,
  type GetTemplateRequest,
} from './clients/language';

// Export storage client
export {
  GrpcStorageClient,
  grpcStorageClient,
  type CreateShareRequest,
  type Share,
  type GetShareRequest,
  type DeleteShareRequest,
  type DeleteShareResponse,
  type SaveSettingsRequest,
  type UserSettings,
  type EditorSettings,
  type ThemeSettings,
  type GetSettingsRequest,
} from './clients/storage';

// Export configuration
export { GRPC_GATEWAY_URL, getGrpcMetadata } from './clients/config';
