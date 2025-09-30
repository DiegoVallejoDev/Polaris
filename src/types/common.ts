/**
 * Common type definitions for the POLARIS framework
 */

export type PlayerId = number;

export interface Identifiable {
  readonly id: string;
}

export interface Serializable {
  serialize(): string;
}

export interface Cloneable<T> {
  clone(): T;
}

export interface Hashable {
  getHashKey(): string;
}

export interface Comparable<T> {
  equals(other: T): boolean;
}

/**
 * Base result interface for operations that may succeed or fail
 */
export interface Result<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
}

/**
 * Utility type for optional configuration objects
 */
export type PartialDeep<T> = {
  [P in keyof T]?: T[P] extends object ? PartialDeep<T[P]> : T[P];
};

/**
 * Timestamp in milliseconds
 */
export type Timestamp = number;

/**
 * Weight value for scoring and evaluation
 */
export type Weight = number;

/**
 * Probability value between 0 and 1
 */
export type Probability = number;

/**
 * Score value for game evaluation
 */
export type Score = number;

/**
 * Confidence level between 0 and 1
 */
export type Confidence = number;