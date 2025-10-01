/**
 * Centralized validation utilities for POLARIS framework
 * Eliminates duplicate validation logic across components
 */

import { Result, ok, err } from "./result";
import { ValidationError } from "../errors/base";

/**
 * Validation rule function type
 */
export type ValidationRule<T> = (
  value: T,
  context?: string
) => Result<T, ValidationError>;

/**
 * Validation context for better error messages
 */
export interface ValidationContext {
  field?: string;
  component?: string;
  operation?: string;
}

/**
 * Common validation utilities
 */
export class Validator {
  /**
   * Validate that a value is not null or undefined
   */
  static required<T>(
    value: T | null | undefined,
    context?: string
  ): Result<T, ValidationError> {
    if (value == null) {
      return err(
        new ValidationError(`${context || "Value"} is required`, {
          value,
          context,
        })
      );
    }
    return ok(value);
  }

  /**
   * Validate that a string is not empty
   */
  static nonEmptyString(
    value: string,
    context?: string
  ): Result<string, ValidationError> {
    const requiredResult = this.required(value, context);
    if (requiredResult.isErr()) {
      return requiredResult;
    }

    if (typeof value !== "string" || value.trim().length === 0) {
      return err(
        new ValidationError(`${context || "String"} must be non-empty`, {
          value,
          context,
        })
      );
    }
    return ok(value);
  }

  /**
   * Validate that a number is within a specific range
   */
  static numberInRange(
    value: number,
    min: number,
    max: number,
    context?: string
  ): Result<number, ValidationError> {
    const requiredResult = this.required(value, context);
    if (requiredResult.isErr()) {
      return requiredResult;
    }

    if (typeof value !== "number" || isNaN(value)) {
      return err(
        new ValidationError(`${context || "Value"} must be a valid number`, {
          value,
          context,
          min,
          max,
        })
      );
    }

    if (value < min || value > max) {
      return err(
        new ValidationError(
          `${context || "Number"} must be between ${min} and ${max}`,
          { value, context, min, max }
        )
      );
    }
    return ok(value);
  }

  /**
   * Validate confidence score (0-1)
   */
  static confidence(
    value: number,
    context?: string
  ): Result<number, ValidationError> {
    return this.numberInRange(value, 0, 1, context || "Confidence");
  }

  /**
   * Validate probability score (0-1)
   */
  static probability(
    value: number,
    context?: string
  ): Result<number, ValidationError> {
    return this.numberInRange(value, 0, 1, context || "Probability");
  }

  /**
   * Validate positive number
   */
  static positiveNumber(
    value: number,
    context?: string
  ): Result<number, ValidationError> {
    const requiredResult = this.required(value, context);
    if (requiredResult.isErr()) {
      return requiredResult;
    }

    if (typeof value !== "number" || isNaN(value) || value <= 0) {
      return err(
        new ValidationError(`${context || "Number"} must be positive`, {
          value,
          context,
        })
      );
    }
    return ok(value);
  }

  /**
   * Validate non-negative number
   */
  static nonNegativeNumber(
    value: number,
    context?: string
  ): Result<number, ValidationError> {
    const requiredResult = this.required(value, context);
    if (requiredResult.isErr()) {
      return requiredResult;
    }

    if (typeof value !== "number" || isNaN(value) || value < 0) {
      return err(
        new ValidationError(`${context || "Number"} must be non-negative`, {
          value,
          context,
        })
      );
    }
    return ok(value);
  }

  /**
   * Validate integer
   */
  static integer(
    value: number,
    context?: string
  ): Result<number, ValidationError> {
    const requiredResult = this.required(value, context);
    if (requiredResult.isErr()) {
      return requiredResult;
    }

    if (typeof value !== "number" || !Number.isInteger(value)) {
      return err(
        new ValidationError(`${context || "Value"} must be an integer`, {
          value,
          context,
        })
      );
    }
    return ok(value);
  }

  /**
   * Validate array is not empty
   */
  static nonEmptyArray<T>(
    value: T[],
    context?: string
  ): Result<T[], ValidationError> {
    const requiredResult = this.required(value, context);
    if (requiredResult.isErr()) {
      return requiredResult;
    }

    if (!Array.isArray(value) || value.length === 0) {
      return err(
        new ValidationError(`${context || "Array"} must be non-empty`, {
          value,
          context,
        })
      );
    }
    return ok(value);
  }

  /**
   * Validate enum value
   */
  static enumValue<T>(
    value: T,
    enumObject: Record<string, T>,
    context?: string
  ): Result<T, ValidationError> {
    const requiredResult = this.required(value, context);
    if (requiredResult.isErr()) {
      return requiredResult;
    }

    const validValues = Object.values(enumObject);
    if (!validValues.includes(value)) {
      return err(
        new ValidationError(
          `${context || "Value"} must be one of: ${validValues.join(", ")}`,
          { value, context, validValues }
        )
      );
    }
    return ok(value);
  }

  /**
   * Validate object has required properties
   */
  static hasProperties<T extends Record<string, any>>(
    obj: T,
    requiredProperties: (keyof T)[],
    context?: string
  ): Result<T, ValidationError> {
    const requiredResult = this.required(obj, context);
    if (requiredResult.isErr()) {
      return requiredResult;
    }

    if (typeof obj !== "object") {
      return err(
        new ValidationError(`${context || "Value"} must be an object`, {
          obj,
          context,
        })
      );
    }

    for (const prop of requiredProperties) {
      if (!(prop in obj) || obj[prop] == null) {
        return err(
          new ValidationError(
            `${context || "Object"} is missing required property: ${String(prop)}`,
            { obj, context, requiredProperties, missingProperty: prop }
          )
        );
      }
    }
    return ok(obj);
  }

  /**
   * Validate API key format (basic check)
   */
  static apiKey(
    value: string,
    context?: string
  ): Result<string, ValidationError> {
    const requiredResult = this.required(value, context);
    if (requiredResult.isErr()) {
      return requiredResult;
    }

    const nonEmptyResult = this.nonEmptyString(value, context);
    if (nonEmptyResult.isErr()) {
      return nonEmptyResult;
    }

    // Basic API key format validation (at least 10 characters)
    if (value.length < 10) {
      return err(
        new ValidationError(
          `${context || "API key"} appears to be invalid (too short)`,
          { context }
        )
      );
    }

    return ok(value);
  }

  /**
   * Validate URL format
   */
  static url(value: string, context?: string): Result<string, ValidationError> {
    const nonEmptyResult = this.nonEmptyString(value, context);
    if (nonEmptyResult.isErr()) {
      return nonEmptyResult;
    }

    try {
      new URL(value);
      return ok(value);
    } catch {
      return err(
        new ValidationError(`${context || "URL"} is not a valid URL`, {
          value,
          context,
        })
      );
    }
  }

  /**
   * Combine multiple validation rules
   */
  static combine<T>(
    value: T,
    rules: ValidationRule<T>[],
    context?: string
  ): Result<T, ValidationError> {
    for (const rule of rules) {
      const result = rule(value, context);
      if (result.isErr()) {
        return result;
      }
    }
    return ok(value);
  }
}

/**
 * Evaluation result validation
 */
export class EvaluationValidator {
  /**
   * Validate evaluation result structure
   */
  static validateEvaluationResult(
    evaluation: any,
    context?: string
  ): Result<any, ValidationError> {
    const ctx = context || "Evaluation result";

    // Check required properties
    const hasPropertiesResult = Validator.hasProperties(
      evaluation,
      ["agentId", "score", "confidence"],
      ctx
    );
    if (hasPropertiesResult.isErr()) {
      return hasPropertiesResult;
    }

    // Validate score
    const scoreResult = Validator.numberInRange(
      evaluation.score,
      -1,
      1,
      `${ctx}.score`
    );
    if (scoreResult.isErr()) {
      return scoreResult;
    }

    // Validate confidence
    const confidenceResult = Validator.confidence(
      evaluation.confidence,
      `${ctx}.confidence`
    );
    if (confidenceResult.isErr()) {
      return confidenceResult;
    }

    // Validate agent ID
    const agentIdResult = Validator.nonEmptyString(
      evaluation.agentId,
      `${ctx}.agentId`
    );
    if (agentIdResult.isErr()) {
      return agentIdResult;
    }

    return ok(evaluation);
  }

  /**
   * Sanitize and validate score
   */
  static sanitizeScore(score: any, defaultValue: number = 0.5): number {
    const result = Validator.numberInRange(score, -1, 1, "Score");
    return result.isOk() ? result.unwrap() : defaultValue;
  }

  /**
   * Sanitize and validate confidence
   */
  static sanitizeConfidence(
    confidence: any,
    defaultValue: number = 0.5
  ): number {
    const result = Validator.confidence(confidence, "Confidence");
    return result.isOk() ? result.unwrap() : defaultValue;
  }
}

/**
 * Configuration validation
 */
export class ConfigValidator {
  /**
   * Validate agent configuration
   */
  static validateAgentConfig(
    config: any,
    context?: string
  ): Result<any, ValidationError> {
    const ctx = context || "Agent config";

    // Check required properties
    const hasPropertiesResult = Validator.hasProperties(
      config,
      ["type", "enabled"],
      ctx
    );
    if (hasPropertiesResult.isErr()) {
      return hasPropertiesResult;
    }

    // Validate type
    const typeResult = Validator.nonEmptyString(config.type, `${ctx}.type`);
    if (typeResult.isErr()) {
      return typeResult;
    }

    // Validate enabled
    if (typeof config.enabled !== "boolean") {
      return err(
        new ValidationError(`${ctx}.enabled must be a boolean`, {
          config,
          context,
        })
      );
    }

    // Validate optional weight
    if (config.weight != null) {
      const weightResult = Validator.positiveNumber(
        config.weight,
        `${ctx}.weight`
      );
      if (weightResult.isErr()) {
        return weightResult;
      }
    }

    return ok(config);
  }

  /**
   * Validate search configuration
   */
  static validateSearchConfig(
    config: any,
    context?: string
  ): Result<any, ValidationError> {
    const ctx = context || "Search config";

    // Check required properties
    const hasPropertiesResult = Validator.hasProperties(
      config,
      ["simulationsPerNode", "explorationConstant"],
      ctx
    );
    if (hasPropertiesResult.isErr()) {
      return hasPropertiesResult;
    }

    // Validate simulations per node
    const simulationsResult = Validator.positiveNumber(
      config.simulationsPerNode,
      `${ctx}.simulationsPerNode`
    );
    if (simulationsResult.isErr()) {
      return simulationsResult;
    }

    // Validate exploration constant
    const explorationResult = Validator.positiveNumber(
      config.explorationConstant,
      `${ctx}.explorationConstant`
    );
    if (explorationResult.isErr()) {
      return explorationResult;
    }

    // Validate optional time limit
    if (config.timeLimit != null) {
      const timeLimitResult = Validator.positiveNumber(
        config.timeLimit,
        `${ctx}.timeLimit`
      );
      if (timeLimitResult.isErr()) {
        return timeLimitResult;
      }
    }

    return ok(config);
  }

  /**
   * Validate sentinel configuration
   */
  static validateSentinelConfig(
    config: any,
    context?: string
  ): Result<any, ValidationError> {
    const ctx = context || "Sentinel config";

    // Check required properties
    const hasPropertiesResult = Validator.hasProperties(
      config,
      ["diversityThreshold", "biasDetectionEnabled", "correctionStrength"],
      ctx
    );
    if (hasPropertiesResult.isErr()) {
      return hasPropertiesResult;
    }

    // Validate diversity threshold
    const diversityResult = Validator.probability(
      config.diversityThreshold,
      `${ctx}.diversityThreshold`
    );
    if (diversityResult.isErr()) {
      return diversityResult;
    }

    // Validate correction strength
    const correctionResult = Validator.probability(
      config.correctionStrength,
      `${ctx}.correctionStrength`
    );
    if (correctionResult.isErr()) {
      return correctionResult;
    }

    // Validate bias detection enabled
    if (typeof config.biasDetectionEnabled !== "boolean") {
      return err(
        new ValidationError(`${ctx}.biasDetectionEnabled must be a boolean`, {
          config,
          context,
        })
      );
    }

    return ok(config);
  }
}

/**
 * Builder pattern for validation chains
 */
export class ValidationBuilder<T> {
  private value: T;
  private context: string;
  private errors: ValidationError[] = [];

  constructor(value: T, context: string = "Value") {
    this.value = value;
    this.context = context;
  }

  /**
   * Add a validation rule
   */
  validate(rule: ValidationRule<T>): this {
    const result = rule(this.value, this.context);
    if (result.isErr()) {
      this.errors.push(result.error);
    }
    return this;
  }

  /**
   * Add a custom validation
   */
  custom(predicate: (value: T) => boolean, errorMessage: string): this {
    if (!predicate(this.value)) {
      this.errors.push(
        new ValidationError(errorMessage, {
          value: this.value,
          context: this.context,
        })
      );
    }
    return this;
  }

  /**
   * Build the result
   */
  build(): Result<T, ValidationError> {
    if (this.errors.length > 0) {
      return err(this.errors[0]); // Return first error
    }
    return ok(this.value);
  }

  /**
   * Build with all errors
   */
  buildWithAllErrors(): Result<T, ValidationError[]> {
    if (this.errors.length > 0) {
      return err(this.errors);
    }
    return ok(this.value);
  }
}

/**
 * Create a validation builder
 */
export function validate<T>(value: T, context?: string): ValidationBuilder<T> {
  return new ValidationBuilder(value, context);
}
