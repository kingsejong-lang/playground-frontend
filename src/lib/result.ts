/**
 * Result type for error handling without exceptions.
 * Inspired by Rust's Result<T, E> type.
 *
 * This pattern allows for explicit error handling and makes error cases visible in type signatures.
 *
 * @example
 * ```typescript
 * function divide(a: number, b: number): Result<number, string> {
 *   if (b === 0) {
 *     return err('Division by zero');
 *   }
 *   return ok(a / b);
 * }
 *
 * const result = divide(10, 2);
 * if (result.ok) {
 *   console.log('Result:', result.value);
 * } else {
 *   console.error('Error:', result.error);
 * }
 * ```
 */

export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * Create a successful Result
 */
export function ok<T, E = Error>(value: T): Result<T, E> {
  return { ok: true, value };
}

/**
 * Create a failed Result
 */
export function err<T, E = Error>(error: E): Result<T, E> {
  return { ok: false, error };
}

/**
 * Check if a Result is successful
 */
export function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok === true;
}

/**
 * Check if a Result is a failure
 */
export function isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
  return result.ok === false;
}

/**
 * Map a Result's value if it's successful
 */
export function map<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> {
  if (result.ok) {
    return ok(fn(result.value));
  }
  return result;
}

/**
 * Map a Result's error if it's a failure
 */
export function mapErr<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> {
  if (!result.ok) {
    return err(fn(result.error));
  }
  return result;
}

/**
 * Chain Results together (flatMap)
 */
export function andThen<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  if (result.ok) {
    return fn(result.value);
  }
  return result;
}

/**
 * Unwrap a Result or throw an error
 * Use this sparingly, prefer pattern matching with if (result.ok)
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.ok) {
    return result.value;
  }
  throw result.error;
}

/**
 * Unwrap a Result or return a default value
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  if (result.ok) {
    return result.value;
  }
  return defaultValue;
}

/**
 * Unwrap a Result or compute a default value from the error
 */
export function unwrapOrElse<T, E>(
  result: Result<T, E>,
  fn: (error: E) => T
): T {
  if (result.ok) {
    return result.value;
  }
  return fn(result.error);
}

/**
 * Convert a Promise to a Result
 */
export async function fromPromise<T, E = Error>(
  promise: Promise<T>,
  mapError?: (error: unknown) => E
): Promise<Result<T, E>> {
  try {
    const value = await promise;
    return ok(value);
  } catch (error) {
    if (mapError) {
      return err(mapError(error));
    }
    return err(error as E);
  }
}

/**
 * Convert a function that might throw to a Result
 */
export function tryCatch<T, E = Error>(
  fn: () => T,
  mapError?: (error: unknown) => E
): Result<T, E> {
  try {
    return ok(fn());
  } catch (error) {
    if (mapError) {
      return err(mapError(error));
    }
    return err(error as E);
  }
}

/**
 * Combine multiple Results into one
 * Returns ok with array of values if all are successful
 * Returns first error encountered otherwise
 */
export function combine<T, E>(results: Result<T, E>[]): Result<T[], E> {
  const values: T[] = [];

  for (const result of results) {
    if (!result.ok) {
      return result;
    }
    values.push(result.value);
  }

  return ok(values);
}

/**
 * Standard error types for the application
 */
export type AppError =
  | { type: 'ValidationError'; message: string; field?: string }
  | { type: 'NotFoundError'; message: string; resource: string }
  | { type: 'NetworkError'; message: string; statusCode?: number }
  | { type: 'AuthError'; message: string }
  | { type: 'ParseError'; message: string; data?: unknown }
  | { type: 'UnknownError'; message: string; cause?: unknown };

/**
 * Create a validation error
 */
export function validationError(message: string, field?: string): AppError {
  return { type: 'ValidationError', message, field };
}

/**
 * Create a not found error
 */
export function notFoundError(resource: string, message: string): AppError {
  return { type: 'NotFoundError', message, resource };
}

/**
 * Create a network error
 */
export function networkError(message: string, statusCode?: number): AppError {
  return { type: 'NetworkError', message, statusCode };
}

/**
 * Create an auth error
 */
export function authError(message: string): AppError {
  return { type: 'AuthError', message };
}

/**
 * Create a parse error
 */
export function parseError(message: string, data?: unknown): AppError {
  return { type: 'ParseError', message, data };
}

/**
 * Create an unknown error
 */
export function unknownError(message: string, cause?: unknown): AppError {
  return { type: 'UnknownError', message, cause };
}
