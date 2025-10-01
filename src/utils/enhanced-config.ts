/**
 * Enhanced configuration management system for POLARIS
 * Provides better validation, type safety, and default value handling
 */

import { Result, ok, err } from "./result";
import { Validator, ConfigValidator } from "./validation";
import { ConfigurationError } from "../errors/base";
import { Logger } from "./logger";

/**
 * Configuration source types
 */
export enum ConfigSource {
  ENVIRONMENT = "environment",
  FILE = "file",
  RUNTIME = "runtime",
  DEFAULT = "default",
}

/**
 * Configuration value with metadata
 */
export interface ConfigValue<T> {
  value: T;
  source: ConfigSource;
  validated: boolean;
  defaultValue?: T;
}

/**
 * Configuration registry for centralized config management
 */
class ConfigRegistry {
  private values = new Map<string, ConfigValue<any>>();
  private logger = new Logger("ConfigRegistry");

  /**
   * Set a configuration value
   */
  set<T>(
    key: string,
    value: T,
    source: ConfigSource = ConfigSource.RUNTIME
  ): void {
    this.values.set(key, {
      value,
      source,
      validated: false,
    });
    this.logger.debug(`Config set: ${key}`, {
      source,
      value: this.sanitizeValue(value),
    });
  }

  /**
   * Get a configuration value
   */
  get<T>(key: string): ConfigValue<T> | undefined {
    return this.values.get(key);
  }

  /**
   * Get a configuration value with validation
   */
  getValidated<T>(
    key: string,
    validator: (value: any) => Result<T, ConfigurationError>,
    defaultValue?: T
  ): Result<T, ConfigurationError> {
    const configValue = this.get<T>(key);

    if (!configValue) {
      if (defaultValue !== undefined) {
        this.set(key, defaultValue, ConfigSource.DEFAULT);
        return ok(defaultValue);
      }
      return err(
        new ConfigurationError(`Configuration key '${key}' not found`)
      );
    }

    if (configValue.validated) {
      return ok(configValue.value);
    }

    const validationResult = validator(configValue.value);
    if (validationResult.isOk()) {
      // Mark as validated
      configValue.validated = true;
      this.values.set(key, configValue);
      return validationResult;
    }

    // If validation fails and we have a default, use it
    if (defaultValue !== undefined) {
      this.logger.warn(`Validation failed for ${key}, using default`, {
        error: validationResult.error,
        defaultValue: this.sanitizeValue(defaultValue),
      });
      this.set(key, defaultValue, ConfigSource.DEFAULT);
      return ok(defaultValue);
    }

    return validationResult;
  }

  /**
   * Check if a key exists
   */
  has(key: string): boolean {
    return this.values.has(key);
  }

  /**
   * Get all configuration keys
   */
  keys(): string[] {
    return Array.from(this.values.keys());
  }

  /**
   * Clear all configuration values
   */
  clear(): void {
    this.values.clear();
    this.logger.info("Configuration registry cleared");
  }

  /**
   * Get configuration summary (for debugging)
   */
  getSummary(): Record<string, { source: ConfigSource; hasValue: boolean }> {
    const summary: Record<string, { source: ConfigSource; hasValue: boolean }> =
      {};

    for (const [key, configValue] of this.values) {
      summary[key] = {
        source: configValue.source,
        hasValue: configValue.value !== undefined,
      };
    }

    return summary;
  }

  private sanitizeValue(value: any): any {
    if (typeof value === "string" && value.length > 20) {
      // Potential API key or sensitive value
      return `${value.substring(0, 4)}****${value.substring(value.length - 4)}`;
    }
    return value;
  }
}

// Global configuration registry instance
const configRegistry = new ConfigRegistry();

/**
 * Enhanced environment configuration with validation
 */
export class EnhancedEnvironmentConfig {
  private static logger = new Logger("EnhancedEnvironmentConfig");

  /**
   * Load configuration from environment variables with validation
   */
  static load(): Result<void, ConfigurationError> {
    try {
      // Load API configurations
      this.loadAPIConfigs();

      // Load POLARIS-specific configs
      this.loadPolarisConfigs();

      // Load performance configs
      this.loadPerformanceConfigs();

      this.logger.info("Configuration loaded successfully");
      return ok(undefined);
    } catch (error) {
      const configError = new ConfigurationError(
        `Failed to load configuration: ${error}`,
        { error }
      );
      this.logger.error("Failed to load configuration", configError);
      return err(configError);
    }
  }

  /**
   * Get validated API configuration
   */
  static getAPIConfig(provider: string): Result<APIConfig, ConfigurationError> {
    const key = `api.${provider}`;

    return configRegistry.getValidated(
      key,
      (value: any) => this.validateAPIConfig(value, provider),
      this.getDefaultAPIConfig(provider)
    );
  }

  /**
   * Get validated POLARIS configuration
   */
  static getPolarisConfig(): Result<PolarisRuntimeConfig, ConfigurationError> {
    return configRegistry.getValidated(
      "polaris",
      (value: any) => this.validatePolarisConfig(value),
      this.getDefaultPolarisConfig()
    );
  }

  /**
   * Get validated search configuration
   */
  static getSearchConfig(): Result<SearchRuntimeConfig, ConfigurationError> {
    return configRegistry.getValidated(
      "search",
      (value: any) => this.validateSearchConfig(value),
      this.getDefaultSearchConfig()
    );
  }

  /**
   * Validate all required API keys
   */
  static validateAPIKeys(): Result<APIKeyValidation, ConfigurationError> {
    const providers = ["openai", "anthropic", "google"];
    const results: Record<string, boolean> = {};
    const missing: string[] = [];

    for (const provider of providers) {
      const configResult = this.getAPIConfig(provider);
      if (configResult.isOk() && configResult.unwrap().apiKey) {
        results[provider] = true;
      } else {
        results[provider] = false;
        missing.push(provider.toUpperCase() + "_API_KEY");
      }
    }

    const validation: APIKeyValidation = {
      valid: missing.length === 0,
      results,
      missing,
    };

    return ok(validation);
  }

  // Private helper methods

  private static loadAPIConfigs(): void {
    const providers = ["openai", "anthropic", "google", "ollama"];

    for (const provider of providers) {
      const config = this.buildAPIConfig(provider);
      configRegistry.set(`api.${provider}`, config, ConfigSource.ENVIRONMENT);
    }
  }

  private static loadPolarisConfigs(): void {
    const config: PolarisRuntimeConfig = {
      logLevel: this.getEnvVar("POLARIS_LOG_LEVEL", "info"),
      enableDebug: this.getEnvVarAsBoolean("POLARIS_DEBUG", false),
      enableMetrics: this.getEnvVarAsBoolean("POLARIS_METRICS", true),
      maxConcurrentAgents: this.getEnvVarAsNumber(
        "POLARIS_MAX_CONCURRENT_AGENTS",
        3
      ),
      defaultTimeout: this.getEnvVarAsNumber("POLARIS_DEFAULT_TIMEOUT", 30000),
    };

    configRegistry.set("polaris", config, ConfigSource.ENVIRONMENT);
  }

  private static loadPerformanceConfigs(): void {
    const config = {
      memoryLimit:
        this.getEnvVarAsNumber("POLARIS_MEMORY_LIMIT_MB", 512) * 1024 * 1024,
      gcThreshold: this.getEnvVarAsNumber("POLARIS_GC_THRESHOLD", 100),
      maxTreeNodes: this.getEnvVarAsNumber("POLARIS_MAX_TREE_NODES", 10000),
    };

    configRegistry.set("performance", config, ConfigSource.ENVIRONMENT);
  }

  private static buildAPIConfig(provider: string): APIConfig {
    const upperProvider = provider.toUpperCase();

    return {
      apiKey: this.getEnvVar(`${upperProvider}_API_KEY`, ""),
      baseURL: this.getEnvVar(
        `${upperProvider}_BASE_URL`,
        this.getDefaultBaseURL(provider)
      ),
      timeout: this.getEnvVarAsNumber(`${upperProvider}_TIMEOUT`, 30000),
      maxRetries: this.getEnvVarAsNumber(`${upperProvider}_MAX_RETRIES`, 3),
      retryDelay: this.getEnvVarAsNumber(`${upperProvider}_RETRY_DELAY`, 1000),
    };
  }

  private static validateAPIConfig(
    config: any,
    provider: string
  ): Result<APIConfig, ConfigurationError> {
    try {
      // Basic structure validation
      const hasPropertiesResult = Validator.hasProperties(
        config,
        ["baseURL", "timeout"],
        `API config for ${provider}`
      );
      if (hasPropertiesResult.isErr()) {
        return err(new ConfigurationError(hasPropertiesResult.error.message));
      }

      // Validate URL
      if (config.baseURL) {
        const urlResult = Validator.url(config.baseURL, `${provider} base URL`);
        if (urlResult.isErr()) {
          return err(new ConfigurationError(urlResult.error.message));
        }
      }

      // Validate timeout
      const timeoutResult = Validator.positiveNumber(
        config.timeout,
        `${provider} timeout`
      );
      if (timeoutResult.isErr()) {
        return err(new ConfigurationError(timeoutResult.error.message));
      }

      // Validate API key if present
      if (config.apiKey) {
        const keyResult = Validator.apiKey(
          config.apiKey,
          `${provider} API key`
        );
        if (keyResult.isErr()) {
          return err(new ConfigurationError(keyResult.error.message));
        }
      }

      return ok(config);
    } catch (error) {
      return err(
        new ConfigurationError(`Invalid API config for ${provider}: ${error}`)
      );
    }
  }

  private static validatePolarisConfig(
    config: any
  ): Result<PolarisRuntimeConfig, ConfigurationError> {
    try {
      // Validate log level
      const validLogLevels = ["debug", "info", "warn", "error"];
      if (!validLogLevels.includes(config.logLevel)) {
        return err(
          new ConfigurationError(
            `Invalid log level: ${config.logLevel}. Must be one of: ${validLogLevels.join(", ")}`
          )
        );
      }

      // Validate numeric values
      const maxConcurrentResult = Validator.positiveNumber(
        config.maxConcurrentAgents,
        "maxConcurrentAgents"
      );
      if (maxConcurrentResult.isErr()) {
        return err(new ConfigurationError(maxConcurrentResult.error.message));
      }

      const timeoutResult = Validator.positiveNumber(
        config.defaultTimeout,
        "defaultTimeout"
      );
      if (timeoutResult.isErr()) {
        return err(new ConfigurationError(timeoutResult.error.message));
      }

      return ok(config);
    } catch (error) {
      return err(new ConfigurationError(`Invalid POLARIS config: ${error}`));
    }
  }

  private static validateSearchConfig(
    config: any
  ): Result<SearchRuntimeConfig, ConfigurationError> {
    return ConfigValidator.validateSearchConfig(config).mapError(
      (validationError) =>
        new ConfigurationError(validationError.message, validationError.context)
    );
  }

  // Default configurations

  private static getDefaultAPIConfig(provider: string): APIConfig {
    return {
      apiKey: "",
      baseURL: this.getDefaultBaseURL(provider),
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
    };
  }

  private static getDefaultPolarisConfig(): PolarisRuntimeConfig {
    return {
      logLevel: "info",
      enableDebug: false,
      enableMetrics: true,
      maxConcurrentAgents: 3,
      defaultTimeout: 30000,
    };
  }

  private static getDefaultSearchConfig(): SearchRuntimeConfig {
    return {
      simulationsPerNode: 100,
      explorationConstant: Math.sqrt(2),
      maxDepth: 50,
      timeLimit: 10000,
      progressiveWidening: true,
      earlyTermination: {
        minSimulations: 10,
        confidenceThreshold: 0.9,
        scoreDifference: 0.3,
      },
    };
  }

  private static getDefaultBaseURL(provider: string): string {
    const urls: Record<string, string> = {
      openai: "https://api.openai.com/v1",
      anthropic: "https://api.anthropic.com",
      google: "https://generativelanguage.googleapis.com/v1",
      ollama: "http://localhost:11434",
    };
    return urls[provider] || "";
  }

  // Environment variable helpers

  private static getEnvVar(key: string, defaultValue: string = ""): string {
    return process.env[key] || defaultValue;
  }

  private static getEnvVarAsNumber(key: string, defaultValue: number): number {
    const value = process.env[key];
    if (!value) return defaultValue;

    const parsed = Number(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  private static getEnvVarAsBoolean(
    key: string,
    defaultValue: boolean
  ): boolean {
    const value = process.env[key];
    if (!value) return defaultValue;

    return value.toLowerCase() === "true" || value === "1";
  }
}

/**
 * Configuration interfaces
 */
export interface APIConfig {
  apiKey: string;
  baseURL: string;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
}

export interface PolarisRuntimeConfig {
  logLevel: string;
  enableDebug: boolean;
  enableMetrics: boolean;
  maxConcurrentAgents: number;
  defaultTimeout: number;
}

export interface SearchRuntimeConfig {
  simulationsPerNode: number;
  explorationConstant: number;
  maxDepth: number;
  timeLimit?: number;
  progressiveWidening: boolean;
  earlyTermination?: {
    minSimulations: number;
    confidenceThreshold?: number;
    scoreDifference?: number;
  };
}

export interface APIKeyValidation {
  valid: boolean;
  results: Record<string, boolean>;
  missing: string[];
}

/**
 * Configuration builder for programmatic config creation
 */
export class ConfigBuilder {
  private config: any = {};

  /**
   * Set API configuration
   */
  withAPI(provider: string, config: Partial<APIConfig>): this {
    this.config[`api.${provider}`] = {
      ...this.getDefaultAPIConfig(provider),
      ...config,
    };
    return this;
  }

  /**
   * Set POLARIS configuration
   */
  withPolaris(config: Partial<PolarisRuntimeConfig>): this {
    this.config.polaris = { ...this.getDefaultPolarisConfig(), ...config };
    return this;
  }

  /**
   * Set search configuration
   */
  withSearch(config: Partial<SearchRuntimeConfig>): this {
    this.config.search = { ...this.getDefaultSearchConfig(), ...config };
    return this;
  }

  /**
   * Build and apply configuration
   */
  build(): Result<void, ConfigurationError> {
    try {
      for (const [key, value] of Object.entries(this.config)) {
        configRegistry.set(key, value, ConfigSource.RUNTIME);
      }
      return ok(undefined);
    } catch (error) {
      return err(
        new ConfigurationError(`Failed to build configuration: ${error}`)
      );
    }
  }

  private getDefaultAPIConfig(provider: string): APIConfig {
    return EnhancedEnvironmentConfig["getDefaultAPIConfig"](provider);
  }

  private getDefaultPolarisConfig(): PolarisRuntimeConfig {
    return EnhancedEnvironmentConfig["getDefaultPolarisConfig"]();
  }

  private getDefaultSearchConfig(): SearchRuntimeConfig {
    return EnhancedEnvironmentConfig["getDefaultSearchConfig"]();
  }
}

/**
 * Create a configuration builder
 */
export function createConfigBuilder(): ConfigBuilder {
  return new ConfigBuilder();
}

// Export the configuration registry for advanced usage
export { configRegistry };
