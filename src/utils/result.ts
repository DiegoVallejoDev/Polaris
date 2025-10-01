/**
 * Result utility pattern for better error handling
 * Provides a functional approach to error handling without exceptions
 */

/**
 * Base Result interface for operations that may succeed or fail
 */
export interface Result<T, E = Error> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: E;

  // Method signatures for type checking
  isOk(): this is Ok<T>;
  isErr(): this is Err<E>;
  unwrap(): T;
  unwrapOr(defaultValue: T): T;
  map<U>(fn: (value: T) => U): Result<U, E>;
  flatMap<U, F>(fn: (value: T) => Result<U, F>): Result<U, E | F>;
  mapError<F>(fn: (error: E) => F): Result<T, F>;
}

/**
 * Success result
 */
export class Ok<T> implements Result<T, never> {
  readonly success = true;
  readonly data: T;

  constructor(data: T) {
    this.data = data;
  }

  map<U>(fn: (value: T) => U): Result<U, never> {
    return new Ok(fn(this.data));
  }

  flatMap<U, F>(fn: (value: T) => Result<U, F>): Result<U, F> {
    return fn(this.data);
  }

  mapError<F>(_fn: (error: never) => F): Result<T, F> {
    return this;
  }

  unwrap(): T {
    return this.data;
  }

  unwrapOr(_defaultValue: T): T {
    return this.data;
  }

  isOk(): this is Ok<T> {
    return true;
  }

  isErr(): this is Err<never> {
    return false;
  }
}

/**
 * Error result
 */
export class Err<E> implements Result<never, E> {
  readonly success = false;
  readonly error: E;

  constructor(error: E) {
    this.error = error;
  }

  map<U>(_fn: (value: never) => U): Result<U, E> {
    return this;
  }

  flatMap<U, F>(_fn: (value: never) => Result<U, F>): Result<U, E | F> {
    return this;
  }

  mapError<F>(fn: (error: E) => F): Result<never, F> {
    return new Err(fn(this.error));
  }

  unwrap(): never {
    throw this.error;
  }

  unwrapOr<T>(defaultValue: T): T {
    return defaultValue;
  }

  isOk(): this is Ok<never> {
    return false;
  }

  isErr(): this is Err<E> {
    return true;
  }
}

/**
 * Create a successful result
 */
export function ok<T>(data: T): Ok<T> {
  return new Ok(data);
}

/**
 * Create an error result
 */
export function err<E>(error: E): Err<E> {
  return new Err(error);
}

/**
 * Wrap a potentially throwing function in a Result
 */
export function tryCatch<T>(fn: () => T): Result<T, Error> {
  try {
    return ok(fn());
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Wrap an async potentially throwing function in a Result
 */
export async function tryAsync<T>(
  fn: () => Promise<T>
): Promise<Result<T, Error>> {
  try {
    const result = await fn();
    return ok(result);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Combine multiple results into a single result
 * Returns Ok with array of all values if all are Ok, otherwise returns first Err
 */
export function combine<T, E>(results: Result<T, E>[]): Result<T[], E> {
  const values: T[] = [];

  for (const result of results) {
    if (result.isErr()) {
      return result;
    }
    values.push(result.unwrap());
  }

  return ok(values);
}

/**
 * Sequence async results, stopping at the first error
 */
export async function sequenceAsync<T, E>(
  promises: Promise<Result<T, E>>[]
): Promise<Result<T[], E>> {
  const results: T[] = [];

  for (const promise of promises) {
    const result = await promise;
    if (result.isErr()) {
      return result;
    }
    results.push(result.unwrap());
  }

  return ok(results);
}

/**
 * Apply a function to each element and collect results
 */
export function traverse<T, U, E>(
  items: T[],
  fn: (item: T) => Result<U, E>
): Result<U[], E> {
  const results = items.map(fn);
  return combine(results);
}

/**
 * Apply an async function to each element and collect results
 */
export async function traverseAsync<T, U, E>(
  items: T[],
  fn: (item: T) => Promise<Result<U, E>>
): Promise<Result<U[], E>> {
  const promises = items.map(fn);
  return sequenceAsync(promises);
}

/**
 * Partition results into successes and failures
 */
export function partition<T, E>(
  results: Result<T, E>[]
): { successes: T[]; failures: E[] } {
  const successes: T[] = [];
  const failures: E[] = [];

  for (const result of results) {
    if (result.isOk()) {
      successes.push(result.unwrap());
    } else if (result.isErr()) {
      failures.push(result.error);
    }
  }

  return { successes, failures };
}

/**
 * Type guard for Ok results
 */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.success;
}

/**
 * Type guard for Err results
 */
export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return !result.success;
}

/**
 * Convert a nullable value to a Result
 */
export function fromNullable<T>(
  value: T | null | undefined,
  error: Error = new Error("Value is null or undefined")
): Result<T, Error> {
  return value != null ? ok(value) : err(error);
}

/**
 * Convert a boolean to a Result
 */
export function fromBoolean(
  condition: boolean,
  error: Error = new Error("Condition is false")
): Result<true, Error> {
  return condition ? ok(true as const) : err(error);
}
