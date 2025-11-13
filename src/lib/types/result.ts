/**
 * Result type for explicit error handling.
 * Follows Railway-Oriented Programming pattern.
 *
 * @template T - The success value type
 * @template E - The error type (defaults to Error)
 *
 * @example
 * ```typescript
 * function divide(a: number, b: number): Result<number, MathError> {
 *   if (b === 0) {
 *     return { ok: false, error: new MathError('Division by zero') };
 *   }
 *   return { ok: true, value: a / b };
 * }
 *
 * const result = divide(10, 2);
 * if (result.ok) {
 *   console.log(result.value); // 5
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * Type guard to check if a Result is successful.
 *
 * @param result - The Result to check
 * @returns True if the result is successful
 */
export function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok === true;
}

/**
 * Type guard to check if a Result is an error.
 *
 * @param result - The Result to check
 * @returns True if the result is an error
 */
export function isError<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
  return result.ok === false;
}

/**
 * Maps a Result's success value to a new value.
 *
 * @param result - The Result to map
 * @param fn - The function to apply to the success value
 * @returns A new Result with the mapped value
 */
export function mapResult<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> {
  if (result.ok) {
    return { ok: true, value: fn(result.value) };
  }
  return result;
}

/**
 * Maps a Result's error to a new error.
 *
 * @param result - The Result to map
 * @param fn - The function to apply to the error
 * @returns A new Result with the mapped error
 */
export function mapError<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> {
  if (!result.ok) {
    return { ok: false, error: fn(result.error) };
  }
  return result;
}

/**
 * Unwraps a Result, returning the value or throwing the error.
 * Use only when you're certain the Result is successful.
 *
 * @param result - The Result to unwrap
 * @returns The success value
 * @throws The error if the Result is an error
 */
export function unwrap<T, E extends Error>(result: Result<T, E>): T {
  if (result.ok) {
    return result.value;
  }
  throw result.error;
}

/**
 * Unwraps a Result, returning the value or a default value.
 *
 * @param result - The Result to unwrap
 * @param defaultValue - The default value to return if the Result is an error
 * @returns The success value or the default value
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  if (result.ok) {
    return result.value;
  }
  return defaultValue;
}

/**
 * Combines multiple Results into a single Result.
 * If all Results are successful, returns a Result with an array of values.
 * If any Result is an error, returns the first error.
 *
 * @param results - An array of Results to combine
 * @returns A Result containing an array of values or the first error
 */
export function combineResults<T, E>(
  results: Result<T, E>[]
): Result<T[], E> {
  const values: T[] = [];

  for (const result of results) {
    if (!result.ok) {
      return result;
    }
    values.push(result.value);
  }

  return { ok: true, value: values };
}
