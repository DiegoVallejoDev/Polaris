/**
 * Base error classes for POLARIS framework
 */

/**
 * Base error class for all POLARIS errors
 */
export class PolarisError extends Error {
  public readonly code: string;
  public readonly context: Record<string, any> | undefined;

  constructor(
    message: string,
    code: string = "POLARIS_ERROR",
    context: Record<string, any> | undefined = undefined
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;

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
