/**
 * Base error classes for POLARIS framework
 */

/**
 * Base error class for all POLARIS errors
 */
export class PolarisError extends Error {
  public readonly code: string;
  public readonly context: Record<string, any> | undefined;
  public readonly retryable: boolean;

  constructor(
    message: string,
    code: string = "POLARIS_ERROR",
    context: Record<string, any> | undefined = undefined,
    retryable: boolean = false
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
    this.retryable = retryable;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Configuration-related errors
 */
export class ConfigurationError extends PolarisError {
  constructor(
    message: string,
    context: Record<string, any> | undefined = undefined
  ) {
    super(message, "CONFIGURATION_ERROR", context);
  }
}

/**
 * Validation-related errors
 */
export class ValidationError extends PolarisError {
  constructor(
    message: string,
    context: Record<string, any> | undefined = undefined
  ) {
    super(message, "VALIDATION_ERROR", context);
  }
}

/**
 * Search-related errors
 */
export class SearchError extends PolarisError {
  constructor(
    message: string,
    context: Record<string, any> | undefined = undefined
  ) {
    super(message, "SEARCH_ERROR", context);
  }
}

/**
 * Agent-related errors
 */
export class AgentError extends PolarisError {
  constructor(
    message: string,
    context: Record<string, any> | undefined = undefined
  ) {
    super(message, "AGENT_ERROR", context);
  }
}

/**
 * API/provider errors — retryable by default (rate limits, timeouts, transient failures)
 */
export class APIError extends PolarisError {
  public readonly statusCode: number | undefined;

  constructor(
    message: string,
    statusCode?: number,
    context: Record<string, any> | undefined = undefined
  ) {
    const retryable = statusCode !== undefined
      ? statusCode === 429 || statusCode >= 500
      : true;
    super(message, "API_ERROR", context, retryable);
    this.statusCode = statusCode;
  }
}

/**
 * Domain-related errors
 */
export class DomainError extends PolarisError {
  constructor(
    message: string,
    context: Record<string, any> | undefined = undefined
  ) {
    super(message, "DOMAIN_ERROR", context);
  }
}
