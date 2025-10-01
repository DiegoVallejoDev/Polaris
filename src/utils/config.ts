/**
 * Environment configuration for POLARIS framework
 */

import * as dotenv from "dotenv";
import { LogLevel } from "./logger";

// Load environment variables from .env file
dotenv.config();

/**
 * API configuration for different providers
 */
export interface APIConfig {
  apiKey: string;
  timeout?: number;
  maxRetries?: number;
  organizationId?: string; // For OpenAI
}

/**
 * POLARIS framework configuration loaded from environment variables
 */
export class EnvironmentConfig {
  // OpenAI Configuration
  static readonly OPENAI: APIConfig = {
    apiKey: process.env.OPENAI_API_KEY || "",
    organizationId: process.env.OPENAI_ORGANIZATION_ID || "",
    timeout: parseInt(process.env.OPENAI_TIMEOUT || "30000"),
    maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || "3"),
  };

  // Anthropic Configuration
  static readonly ANTHROPIC: APIConfig = {
    apiKey: process.env.ANTHROPIC_API_KEY || "",
    timeout: parseInt(process.env.ANTHROPIC_TIMEOUT || "30000"),
    maxRetries: parseInt(process.env.ANTHROPIC_MAX_RETRIES || "3"),
  };

  // Google Configuration
  static readonly GOOGLE: APIConfig = {
    apiKey: process.env.GOOGLE_API_KEY || "",
    timeout: parseInt(process.env.GOOGLE_TIMEOUT || "30000"),
    maxRetries: parseInt(process.env.GOOGLE_MAX_RETRIES || "3"),
  };

  // Ollama Configuration (for local models)
  static readonly OLLAMA: APIConfig = {
    apiKey: "", // Ollama doesn't require API key
    timeout: parseInt(process.env.OLLAMA_TIMEOUT || "60000"), // Longer timeout for local models
    maxRetries: parseInt(process.env.OLLAMA_MAX_RETRIES || "3"),
  };

  // POLARIS Framework Configuration
  static readonly POLARIS = {
    logLevel: this.parseLogLevel(process.env.POLARIS_LOG_LEVEL || "info"),
    maxMemory: process.env.POLARIS_MAX_MEMORY || "512MB",
    defaultTimeout: parseInt(process.env.POLARIS_DEFAULT_TIMEOUT || "30000"),

    // Search Configuration
    maxDepth: parseInt(process.env.POLARIS_MAX_DEPTH || "10"),
    simulationsPerNode: parseInt(
      process.env.POLARIS_SIMULATIONS_PER_NODE || "100"
    ),
    explorationConstant: parseFloat(
      process.env.POLARIS_EXPLORATION_CONSTANT || "1.414"
    ),
    timeLimit: parseInt(process.env.POLARIS_TIME_LIMIT || "5000"),

    // Sentinel Configuration
    diversityThreshold: parseFloat(
      process.env.POLARIS_DIVERSITY_THRESHOLD || "0.3"
    ),
    biasDetection: process.env.POLARIS_BIAS_DETECTION === "true",
    correctionStrength: parseFloat(
      process.env.POLARIS_CORRECTION_STRENGTH || "0.5"
    ),
    interventionThreshold: parseFloat(
      process.env.POLARIS_INTERVENTION_THRESHOLD || "0.6"
    ),
  };

  // Development Configuration
  static readonly DEVELOPMENT = {
    nodeEnv: process.env.NODE_ENV || "development",
    debug: process.env.DEBUG || "",
    testTimeout: parseInt(process.env.TEST_TIMEOUT || "10000"),
    testAPICalls: process.env.TEST_API_CALLS === "true",
    enableMetrics: process.env.ENABLE_METRICS === "true",
    metricsPort: parseInt(process.env.METRICS_PORT || "3001"),
  };

  // Chess Demo Configuration
  static readonly CHESS = {
    timeControl: process.env.CHESS_TIME_CONTROL || "5+3",
    openingBook: process.env.CHESS_OPENING_BOOK === "true",
    endgameTablebase: process.env.CHESS_ENDGAME_TABLEBASE === "true",
    autoPlay: process.env.DEMO_AUTO_PLAY === "true",
    analysisDepth: parseInt(process.env.DEMO_ANALYSIS_DEPTH || "15"),
    showThinking: process.env.DEMO_SHOW_THINKING === "true",
  };

  // Advanced Features Configuration
  static readonly ADVANCED = {
    enableParallelAgents: process.env.ENABLE_PARALLEL_AGENTS === "true",
    maxConcurrentAgents: parseInt(process.env.MAX_CONCURRENT_AGENTS || "5"),
    enableAgentLearning: process.env.ENABLE_AGENT_LEARNING === "true",
    learningRate: parseFloat(process.env.LEARNING_RATE || "0.01"),
    experienceBufferSize: parseInt(
      process.env.EXPERIENCE_BUFFER_SIZE || "1000"
    ),
    enableHybridReasoning: process.env.ENABLE_HYBRID_REASONING === "true",
  };

  /**
   * Check if all required API keys are present
   */
  static validateAPIKeys(): { valid: boolean; missing: string[] } {
    const missing: string[] = [];

    if (!this.OPENAI.apiKey) missing.push("OPENAI_API_KEY");
    if (!this.ANTHROPIC.apiKey) missing.push("ANTHROPIC_API_KEY");
    if (!this.GOOGLE.apiKey) missing.push("GOOGLE_API_KEY");

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Get configuration for a specific API provider
   */
  static getAPIConfig(
    provider: "openai" | "anthropic" | "google" | "ollama"
  ): APIConfig {
    switch (provider) {
      case "openai":
        return this.OPENAI;
      case "anthropic":
        return this.ANTHROPIC;
      case "google":
        return this.GOOGLE;
      case "ollama":
        return this.OLLAMA;
      default:
        throw new Error(`Unknown API provider: ${provider}`);
    }
  }

  /**
   * Check if running in development mode
   */
  static isDevelopment(): boolean {
    return this.DEVELOPMENT.nodeEnv === "development";
  }

  /**
   * Check if running in production mode
   */
  static isProduction(): boolean {
    return this.DEVELOPMENT.nodeEnv === "production";
  }

  /**
   * Get memory limit in bytes
   */
  static getMemoryLimitBytes(): number {
    const memLimit = this.POLARIS.maxMemory;
    const match = memLimit.match(/^(\d+)(MB|GB|KB)?$/i);

    if (!match) return 512 * 1024 * 1024; // Default 512MB

    const value = parseInt(match[1]);
    const unit = (match[2] || "MB").toUpperCase();

    switch (unit) {
      case "KB":
        return value * 1024;
      case "MB":
        return value * 1024 * 1024;
      case "GB":
        return value * 1024 * 1024 * 1024;
      default:
        return value;
    }
  }

  /**
   * Parse log level from string
   */
  private static parseLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case "debug":
        return LogLevel.DEBUG;
      case "info":
        return LogLevel.INFO;
      case "warn":
        return LogLevel.WARN;
      case "error":
        return LogLevel.ERROR;
      default:
        return LogLevel.INFO;
    }
  }

  /**
   * Print configuration summary (without sensitive data)
   */
  static printConfigSummary(): void {
    console.log("🔧 POLARIS Configuration Summary:");
    console.log(`  Environment: ${this.DEVELOPMENT.nodeEnv}`);
    console.log(`  Log Level: ${LogLevel[this.POLARIS.logLevel]}`);
    console.log(`  Max Memory: ${this.POLARIS.maxMemory}`);
    console.log(`  Max Depth: ${this.POLARIS.maxDepth}`);
    console.log(`  Simulations/Node: ${this.POLARIS.simulationsPerNode}`);
    console.log(`  Diversity Threshold: ${this.POLARIS.diversityThreshold}`);
    console.log(
      `  Bias Detection: ${this.POLARIS.biasDetection ? "Enabled" : "Disabled"}`
    );

    const apiValidation = this.validateAPIKeys();
    console.log(
      `  API Keys: ${apiValidation.valid ? "All Present" : `Missing: ${apiValidation.missing.join(", ")}`}`
    );

    console.log(
      `  Parallel Agents: ${this.ADVANCED.enableParallelAgents ? "Enabled" : "Disabled"}`
    );
    console.log(
      `  Agent Learning: ${this.ADVANCED.enableAgentLearning ? "Enabled" : "Disabled"}`
    );
  }
}

/**
 * Utility function to safely get environment variable with default
 */
export function getEnvVar(key: string, defaultValue: string = ""): string {
  return process.env[key] || defaultValue;
}

/**
 * Utility function to get environment variable as number
 */
export function getEnvVarAsNumber(
  key: string,
  defaultValue: number = 0
): number {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

/**
 * Utility function to get environment variable as boolean
 */
export function getEnvVarAsBoolean(
  key: string,
  defaultValue: boolean = false
): boolean {
  const value = process.env[key];
  return value ? value.toLowerCase() === "true" : defaultValue;
}
