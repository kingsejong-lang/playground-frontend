/**
 * gRPC-Web client wrapper for ExecutionService
 * Provides a clean TypeScript API for code execution via gRPC
 */

import { ExecutionServiceClient } from '../generated/execution/v1/ExecutionServiceClientPb';
import * as executionPb from '../generated/execution/v1/execution_pb';
import { getGrpcMetadata, GRPC_GATEWAY_URL } from './config';

/**
 * TypeScript interfaces matching protobuf messages
 */
export interface ExecuteRequest {
  language: string;
  files: Record<string, string>;
  args?: string;
  stdin?: string;
  timeoutSeconds?: number;
  requestId?: string;
  userId?: string;
}

export interface ExecuteResponse {
  requestId: string;
  success: boolean;
  events: ExecutionEvent[];
  metrics?: ExecutionMetrics;
  error?: ExecutionError;
}

export interface ExecutionEvent {
  kind: 'KIND_STDOUT' | 'KIND_STDERR' | 'KIND_COMPILE' | 'KIND_SYSTEM';
  message: string;
  timestamp: string;
}

export interface ExecutionMetrics {
  compileTimeMs: number;
  runTimeMs: number;
  memoryBytes: number;
  cpuPercent: number;
}

export interface ExecutionError {
  code: string;
  message: string;
  details?: string;
}

export interface CancelRequest {
  requestId: string;
}

export interface CancelResponse {
  cancelled: boolean;
  message: string;
}

export interface GetStatusRequest {
  requestId: string;
}

export interface ExecutionStatus {
  requestId: string;
  status: 'STATUS_PENDING' | 'STATUS_COMPILING' | 'STATUS_RUNNING' | 'STATUS_COMPLETED' | 'STATUS_FAILED' | 'STATUS_CANCELLED' | 'STATUS_TIMEOUT';
  progress: number;
  startedAt?: string;
  completedAt?: string;
}

/**
 * gRPC-Web client for ExecutionService
 */
export class GrpcExecutionClient {
  private client: ExecutionServiceClient;

  constructor(hostname: string = GRPC_GATEWAY_URL) {
    this.client = new ExecutionServiceClient(hostname, null, null);
  }

  /**
   * Execute code synchronously
   */
  async execute(request: ExecuteRequest): Promise<ExecuteResponse> {
    const req = new executionPb.ExecuteRequest();
    req.setLanguage(request.language);

    const filesMap = req.getFilesMap();
    Object.entries(request.files).forEach(([key, value]) => {
      filesMap.set(key, value);
    });

    if (request.args) req.setArgs(request.args);
    if (request.stdin) req.setStdin(request.stdin);
    if (request.timeoutSeconds) req.setTimeoutSeconds(request.timeoutSeconds);
    if (request.requestId) req.setRequestId(request.requestId);
    if (request.userId) req.setUserId(request.userId);

    return new Promise((resolve, reject) => {
      this.client.execute(req, getGrpcMetadata(), (err, response) => {
        if (err) {
          reject(new Error(`gRPC Execute failed: ${err.message}`));
          return;
        }

        if (!response) {
          reject(new Error('Empty response from gRPC Execute'));
          return;
        }

        resolve(this.parseExecuteResponse(response));
      });
    });
  }

  /**
   * Execute code with streaming events
   */
  executeStream(
    request: ExecuteRequest,
    onEvent: (event: any) => void,
    onEnd?: () => void,
    onError?: (error: Error) => void
  ): void {
    const req = new executionPb.ExecuteRequest();
    req.setLanguage(request.language);

    const filesMap = req.getFilesMap();
    Object.entries(request.files).forEach(([key, value]) => {
      filesMap.set(key, value);
    });

    if (request.args) req.setArgs(request.args);
    if (request.stdin) req.setStdin(request.stdin);
    if (request.timeoutSeconds) req.setTimeoutSeconds(request.timeoutSeconds);
    if (request.requestId) req.setRequestId(request.requestId);
    if (request.userId) req.setUserId(request.userId);

    const stream = this.client.executeStream(req, getGrpcMetadata());

    stream.on('data', (response: executionPb.ExecuteEvent) => {
      onEvent({
        type: this.parseEventType(response.getType()),
        message: response.getMessage(),
        timestamp: response.getTimestamp()?.toDate().toISOString() || new Date().toISOString(),
      });
    });

    stream.on('end', () => {
      onEnd?.();
    });

    stream.on('error', (err: Error) => {
      onError?.(err);
    });
  }

  /**
   * Cancel a running execution
   */
  async cancelExecution(request: CancelRequest): Promise<CancelResponse> {
    const req = new executionPb.CancelRequest();
    req.setRequestId(request.requestId);

    return new Promise((resolve, reject) => {
      this.client.cancelExecution(req, getGrpcMetadata(), (err, response) => {
        if (err) {
          reject(new Error(`gRPC CancelExecution failed: ${err.message}`));
          return;
        }

        if (!response) {
          reject(new Error('Empty response from gRPC CancelExecution'));
          return;
        }

        resolve({
          cancelled: response.getCancelled(),
          message: response.getMessage(),
        });
      });
    });
  }

  /**
   * Get execution status
   */
  async getExecutionStatus(request: GetStatusRequest): Promise<ExecutionStatus> {
    const req = new executionPb.GetStatusRequest();
    req.setRequestId(request.requestId);

    return new Promise((resolve, reject) => {
      this.client.getExecutionStatus(req, getGrpcMetadata(), (err, response) => {
        if (err) {
          reject(new Error(`gRPC GetExecutionStatus failed: ${err.message}`));
          return;
        }

        if (!response) {
          reject(new Error('Empty response from gRPC GetExecutionStatus'));
          return;
        }

        resolve({
          requestId: response.getRequestId(),
          status: this.parseExecutionStatus(response.getStatus()),
          progress: response.getProgress(),
          startedAt: response.getStartedAt()?.toDate().toISOString(),
          completedAt: response.getCompletedAt()?.toDate().toISOString(),
        });
      });
    });
  }

  /**
   * Parse ExecuteResponse from protobuf
   */
  private parseExecuteResponse(response: executionPb.ExecuteResponse): ExecuteResponse {
    const events: ExecutionEvent[] = response.getEventsList().map((event) => ({
      kind: this.parseEventKind(event.getKind()),
      message: event.getMessage(),
      timestamp: event.getTimestamp()?.toDate().toISOString() || new Date().toISOString(),
    }));

    const metrics = response.getMetrics();
    const error = response.getError();

    return {
      requestId: response.getRequestId(),
      success: response.getSuccess(),
      events,
      metrics: metrics
        ? {
            compileTimeMs: metrics.getCompileTimeMs(),
            runTimeMs: metrics.getRunTimeMs(),
            memoryBytes: metrics.getMemoryBytes(),
            cpuPercent: metrics.getCpuPercent(),
          }
        : undefined,
      error: error
        ? {
            code: error.getCode(),
            message: error.getMessage(),
            details: error.getDetails(),
          }
        : undefined,
    };
  }

  /**
   * Parse event kind enum
   */
  private parseEventKind(kind: executionPb.Event.Kind): ExecutionEvent['kind'] {
    switch (kind) {
      case executionPb.Event.Kind.KIND_STDOUT:
        return 'KIND_STDOUT';
      case executionPb.Event.Kind.KIND_STDERR:
        return 'KIND_STDERR';
      case executionPb.Event.Kind.KIND_COMPILE:
        return 'KIND_COMPILE';
      case executionPb.Event.Kind.KIND_SYSTEM:
        return 'KIND_SYSTEM';
      default:
        return 'KIND_SYSTEM';
    }
  }

  /**
   * Parse event type enum
   */
  private parseEventType(type: executionPb.ExecuteEvent.Type): string {
    switch (type) {
      case executionPb.ExecuteEvent.Type.TYPE_STARTED:
        return 'started';
      case executionPb.ExecuteEvent.Type.TYPE_COMPILING:
        return 'compiling';
      case executionPb.ExecuteEvent.Type.TYPE_COMPILED:
        return 'compiled';
      case executionPb.ExecuteEvent.Type.TYPE_RUNNING:
        return 'running';
      case executionPb.ExecuteEvent.Type.TYPE_OUTPUT:
        return 'output';
      case executionPb.ExecuteEvent.Type.TYPE_COMPLETED:
        return 'completed';
      case executionPb.ExecuteEvent.Type.TYPE_FAILED:
        return 'failed';
      default:
        return 'unknown';
    }
  }

  /**
   * Parse execution status enum
   */
  private parseExecutionStatus(status: executionPb.ExecutionStatus.Status): ExecutionStatus['status'] {
    switch (status) {
      case executionPb.ExecutionStatus.Status.STATUS_PENDING:
        return 'STATUS_PENDING';
      case executionPb.ExecutionStatus.Status.STATUS_COMPILING:
        return 'STATUS_COMPILING';
      case executionPb.ExecutionStatus.Status.STATUS_RUNNING:
        return 'STATUS_RUNNING';
      case executionPb.ExecutionStatus.Status.STATUS_COMPLETED:
        return 'STATUS_COMPLETED';
      case executionPb.ExecutionStatus.Status.STATUS_FAILED:
        return 'STATUS_FAILED';
      case executionPb.ExecutionStatus.Status.STATUS_CANCELLED:
        return 'STATUS_CANCELLED';
      case executionPb.ExecutionStatus.Status.STATUS_TIMEOUT:
        return 'STATUS_TIMEOUT';
      default:
        return 'STATUS_PENDING';
    }
  }
}

// Export singleton instance
export const grpcExecutionClient = new GrpcExecutionClient();
