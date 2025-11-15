/**
 * Runtime type guards and validation utilities.
 * Provides type-safe runtime validation using Zod schemas.
 */

import { z } from 'zod';
import { Result, ok, err, parseError, validationError } from './result';

/**
 * Validate data against a Zod schema and return a Result
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Result<T, ReturnType<typeof validationError>> {
  const result = schema.safeParse(data);

  if (result.success) {
    return ok(result.data);
  }

  const firstIssue = result.error.issues[0];
  const field = firstIssue?.path.join('.');
  const message = firstIssue?.message || 'Validation failed';

  return err(validationError(message, field));
}

/**
 * Type guard for Error objects
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Type guard for objects with a message property
 */
export function hasMessage(value: unknown): value is { message: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof (value as { message: unknown }).message === 'string'
  );
}

/**
 * Type guard for axios errors
 */
export function isAxiosError(value: unknown): value is {
  response?: { data?: { message?: string }; status?: number };
  message: string;
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    'isAxiosError' in value &&
    (value as { isAxiosError: unknown }).isAxiosError === true
  );
}

/**
 * Safely parse JSON with Result
 */
export function parseJSON<T = unknown>(
  jsonString: string
): Result<T, ReturnType<typeof parseError>> {
  try {
    const parsed = JSON.parse(jsonString) as T;
    return ok(parsed);
  } catch (error) {
    const message = isError(error) ? error.message : 'Failed to parse JSON';
    return err(parseError(message, jsonString));
  }
}

/**
 * Safely validate JSON against a schema
 */
export function parseAndValidate<T>(
  schema: z.ZodSchema<T>,
  jsonString: string
): Result<T, ReturnType<typeof parseError | typeof validationError>> {
  const parseResult = parseJSON(jsonString);
  if (!parseResult.ok) {
    return parseResult;
  }

  const validateResult = validate(schema, parseResult.value);
  if (!validateResult.ok) {
    return validateResult;
  }

  return ok(validateResult.value);
}

/**
 * Type guard for FileReader result
 */
export function isFileReaderResult(
  value: unknown
): value is string | ArrayBuffer | null {
  return (
    typeof value === 'string' ||
    value instanceof ArrayBuffer ||
    value === null
  );
}

/**
 * Safe type assertion with validation
 */
export function assertType<T>(
  schema: z.ZodSchema<T>,
  value: unknown,
  errorMessage?: string
): Result<T, ReturnType<typeof validationError>> {
  return validate(schema, value);
}

/**
 * Type guard for checking if value is defined (not null or undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type guard for checking if value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Type guard for checking if value is an array
 */
export function isArray<T = unknown>(value: unknown): value is T[] {
  return Array.isArray(value);
}

/**
 * Type guard for checking if value is a record/object
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Extract error message from unknown error
 */
export function extractErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }

  if (isAxiosError(error)) {
    return error.response?.data?.message || error.message;
  }

  if (hasMessage(error)) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unknown error occurred';
}

/**
 * Extract error status code from unknown error
 */
export function extractErrorStatus(error: unknown): number | undefined {
  if (isAxiosError(error)) {
    return error.response?.status;
  }

  if (isRecord(error) && typeof error.status === 'number') {
    return error.status;
  }

  return undefined;
}
