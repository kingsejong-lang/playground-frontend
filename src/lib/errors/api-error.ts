/**
 * Base class for all API errors.
 * Provides structured error information with context.
 */
export class ApiError extends Error {
  /**
   * HTTP status code if applicable
   */
  public readonly statusCode?: number;

  /**
   * Error code for programmatic handling
   */
  public readonly code: string;

  /**
   * Additional context about the error
   */
  public readonly context?: Record<string, unknown>;

  /**
   * Timestamp when the error occurred
   */
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: string,
    statusCode?: number,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.timestamp = new Date();

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /**
   * Returns a JSON representation of the error
   */
  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}

/**
 * Network-related errors (connection failures, timeouts)
 */
export class NetworkError extends ApiError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'NETWORK_ERROR', undefined, context);
    this.name = 'NetworkError';
  }
}

/**
 * Validation errors (invalid input, schema mismatch)
 */
export class ValidationError extends ApiError {
  public readonly validationErrors?: Array<{
    field: string;
    message: string;
  }>;

  constructor(
    message: string,
    validationErrors?: Array<{ field: string; message: string }>,
    context?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', 400, context);
    this.name = 'ValidationError';
    this.validationErrors = validationErrors;
  }
}

/**
 * Authentication errors (invalid credentials, missing token)
 */
export class AuthenticationError extends ApiError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'AUTHENTICATION_ERROR', 401, context);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization errors (insufficient permissions)
 */
export class AuthorizationError extends ApiError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'AUTHORIZATION_ERROR', 403, context);
    this.name = 'AuthorizationError';
  }
}

/**
 * Resource not found errors
 */
export class NotFoundError extends ApiError {
  constructor(resource: string, context?: Record<string, unknown>) {
    super(`${resource} not found`, 'NOT_FOUND', 404, context);
    this.name = 'NotFoundError';
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends ApiError {
  public readonly retryAfter?: number;

  constructor(
    message: string,
    retryAfter?: number,
    context?: Record<string, unknown>
  ) {
    super(message, 'RATE_LIMIT_ERROR', 429, context);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Server errors (500+)
 */
export class ServerError extends ApiError {
  constructor(message: string, statusCode: number, context?: Record<string, unknown>) {
    super(message, 'SERVER_ERROR', statusCode, context);
    this.name = 'ServerError';
  }
}

/**
 * Timeout errors
 */
export class TimeoutError extends ApiError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'TIMEOUT_ERROR', 408, context);
    this.name = 'TimeoutError';
  }
}

/**
 * Creates an appropriate ApiError from an HTTP response.
 *
 * @param status - HTTP status code
 * @param statusText - HTTP status text
 * @param data - Response data (optional)
 * @returns An appropriate ApiError subclass
 */
export function createErrorFromResponse(
  status: number,
  statusText: string,
  data?: unknown
): ApiError {
  const context = data ? { response: data } : undefined;
  const message = typeof data === 'object' && data !== null && 'message' in data
    ? String((data as { message: unknown }).message)
    : statusText;

  if (status === 400) {
    return new ValidationError(message, undefined, context);
  }

  if (status === 401) {
    return new AuthenticationError(message, context);
  }

  if (status === 403) {
    return new AuthorizationError(message, context);
  }

  if (status === 404) {
    return new NotFoundError(message, context);
  }

  if (status === 408) {
    return new TimeoutError(message, context);
  }

  if (status === 429) {
    const retryAfter = typeof data === 'object' && data !== null && 'retry_after' in data
      ? Number((data as { retry_after: unknown }).retry_after)
      : undefined;
    return new RateLimitError(message, retryAfter, context);
  }

  if (status >= 500) {
    return new ServerError(message, status, context);
  }

  return new ApiError(message, 'UNKNOWN_ERROR', status, context);
}

/**
 * Type guard to check if an error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Extracts a user-friendly error message from any error
 */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unknown error occurred';
}
