/**
 * Factory patterns for agent creation in POLARIS framework
 * Reduces coupling and improves testability
 */

import { Agent } from "../agents/base/agent";
import { AgentParameters } from "../agents/base/parameters";
import { Result, ok, err } from "./result";
import { ConfigurationError, AgentError } from "../errors/base";
import { Validator } from "./validation";
import { Logger } from "./logger";
import { EnhancedEnvironmentConfig } from "./enhanced-config";

/**
 * Agent type registry
 */
export enum AgentType {
  OPENAI = "openai",
  ANTHROPIC = "anthropic",
  GOOGLE = "google",
  OLLAMA = "ollama",
  HEURISTIC = "heuristic",
  RANDOM = "random",
}

/**
 * Agent configuration for factory
 */
export interface AgentFactoryConfig {
  type: AgentType;
  id?: string;
  name?: string;
  parameters: AgentParameters;
  enabled: boolean;
  weight?: number;
}

/**
 * Agent creation context
 */
export interface AgentCreationContext {
  factoryId: string;
  timestamp: number;
  environment: Record<string, any>;
  validationLevel: ValidationLevel;
}

/**
 * Validation levels for agent creation
 */
export enum ValidationLevel {
  NONE = "none",
  BASIC = "basic",
  STRICT = "strict",
}

/**
 * Agent factory interface
 */
export interface AgentFactory {
  readonly type: AgentType;
  readonly name: string;

  /**
   * Create an agent instance
   */
  create(
    config: AgentFactoryConfig,
    context: AgentCreationContext
  ): Promise<Result<Agent, AgentError>>;

  /**
   * Validate configuration before creation
   */
  validateConfig(
    config: AgentFactoryConfig
  ): Result<AgentFactoryConfig, ConfigurationError>;

  /**
   * Check if this factory can create the requested agent type
   */
  canCreate(type: AgentType): boolean;

  /**
   * Get default configuration for this agent type
   */
  getDefaultConfig(): Partial<AgentFactoryConfig>;
}

/**
 * Base agent factory with common functionality
 */
export abstract class BaseAgentFactory implements AgentFactory {
  protected logger: Logger;

  constructor(
    public readonly type: AgentType,
    public readonly name: string
  ) {
    this.logger = new Logger(`${name}Factory`);
  }

  abstract create(
    config: AgentFactoryConfig,
    context: AgentCreationContext
  ): Promise<Result<Agent, AgentError>>;
  abstract getDefaultConfig(): Partial<AgentFactoryConfig>;

  validateConfig(
    config: AgentFactoryConfig
  ): Result<AgentFactoryConfig, ConfigurationError> {
    // Basic validation
    const typeResult = Validator.enumValue(
      config.type,
      AgentType,
      "Agent type"
    );
    if (typeResult.isErr()) {
      return err(new ConfigurationError(typeResult.error.message));
    }

    const enabledResult = Validator.required(
      config.enabled,
      "Agent enabled flag"
    );
    if (enabledResult.isErr()) {
      return err(new ConfigurationError(enabledResult.error.message));
    }

    if (config.weight != null) {
      const weightResult = Validator.positiveNumber(
        config.weight,
        "Agent weight"
      );
      if (weightResult.isErr()) {
        return err(new ConfigurationError(weightResult.error.message));
      }
    }

    if (config.id) {
      const idResult = Validator.nonEmptyString(config.id, "Agent ID");
      if (idResult.isErr()) {
        return err(new ConfigurationError(idResult.error.message));
      }
    }

    return ok(config);
  }

  canCreate(type: AgentType): boolean {
    return this.type === type;
  }

  protected validateAPIKey(
    apiKey: string,
    provider: string
  ): Result<string, ConfigurationError> {
    if (!apiKey) {
      return err(
        new ConfigurationError(
          `API key for ${provider} is required but not provided. Check your environment variables.`
        )
      );
    }

    const keyResult = Validator.apiKey(apiKey, `${provider} API key`);
    if (keyResult.isErr()) {
      return err(new ConfigurationError(keyResult.error.message));
    }

    return ok(apiKey);
  }

  protected generateAgentId(type: string, name?: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const namePrefix = name ? `${name}_` : "";
    return `${namePrefix}${type}_${timestamp}_${random}`;
  }

  protected async validateAgentAfterCreation(
    agent: Agent,
    context: AgentCreationContext
  ): Promise<Result<Agent, AgentError>> {
    if (context.validationLevel === ValidationLevel.NONE) {
      return ok(agent);
    }

    try {
      // Basic validation
      if (!agent.id || !agent.name || !agent.type) {
        return err(new AgentError("Agent missing required properties"));
      }

      // Strict validation - test initialization
      if (context.validationLevel === ValidationLevel.STRICT) {
        if (agent.initialize) {
          await agent.initialize();
        }

        if (!agent.isReady()) {
          return err(new AgentError("Agent failed to initialize properly"));
        }
      }

      return ok(agent);
    } catch (error) {
      return err(new AgentError(`Agent validation failed: ${error}`));
    }
  }
}

/**
 * OpenAI agent factory
 */
export class OpenAIAgentFactory extends BaseAgentFactory {
  constructor() {
    super(AgentType.OPENAI, "OpenAI");
  }

  async create(
    config: AgentFactoryConfig,
    context: AgentCreationContext
  ): Promise<Result<Agent, AgentError>> {
    try {
      // Validate configuration
      const configResult = this.validateConfig(config);
      if (configResult.isErr()) {
        return err(new AgentError(configResult.error.message));
      }

      // Get API configuration
      const apiConfigResult = EnhancedEnvironmentConfig.getAPIConfig("openai");
      if (apiConfigResult.isErr()) {
        return err(
          new AgentError(
            `Failed to get OpenAI API config: ${apiConfigResult.error.message}`
          )
        );
      }

      const apiConfig = apiConfigResult.unwrap();

      // Validate API key
      const keyResult = this.validateAPIKey(apiConfig.apiKey, "OpenAI");
      if (keyResult.isErr()) {
        return err(new AgentError(keyResult.error.message));
      }

      // Create agent configuration
      const agentConfig = {
        id: config.id || this.generateAgentId("openai", config.name),
        name: config.name || "OpenAI-GPT",
        provider: "openai" as const,
        ...config.parameters,
        apiKey: apiConfig.apiKey,
        baseURL: apiConfig.baseURL,
        timeout: apiConfig.timeout,
        model: config.parameters.model || "gpt-4o",
        temperature: config.parameters.temperature || 0.7,
        maxTokens: config.parameters.maxTokens || 1000,
      };

      // Dynamic import to avoid circular dependencies
      const { OpenAIAgent } = await import("../agents/web/openai-agent");
      const agent = new OpenAIAgent(agentConfig);

      // Validate after creation
      const validationResult = await this.validateAgentAfterCreation(
        agent,
        context
      );
      if (validationResult.isErr()) {
        return validationResult;
      }

      this.logger.info("OpenAI agent created successfully", {
        agentId: agent.id,
        model: agentConfig.model,
        contextId: context.factoryId,
      });

      return ok(agent);
    } catch (error) {
      this.logger.error("Failed to create OpenAI agent", error);
      return err(new AgentError(`OpenAI agent creation failed: ${error}`));
    }
  }

  getDefaultConfig(): Partial<AgentFactoryConfig> {
    return {
      type: AgentType.OPENAI,
      enabled: true,
      weight: 1.0,
      parameters: {
        model: "gpt-4o",
        temperature: 0.7,
        maxTokens: 1000,
      },
    };
  }
}

/**
 * Anthropic agent factory
 */
export class AnthropicAgentFactory extends BaseAgentFactory {
  constructor() {
    super(AgentType.ANTHROPIC, "Anthropic");
  }

  async create(
    config: AgentFactoryConfig,
    context: AgentCreationContext
  ): Promise<Result<Agent, AgentError>> {
    try {
      const configResult = this.validateConfig(config);
      if (configResult.isErr()) {
        return err(new AgentError(configResult.error.message));
      }

      const apiConfigResult =
        EnhancedEnvironmentConfig.getAPIConfig("anthropic");
      if (apiConfigResult.isErr()) {
        return err(
          new AgentError(
            `Failed to get Anthropic API config: ${apiConfigResult.error.message}`
          )
        );
      }

      const apiConfig = apiConfigResult.unwrap();
      const keyResult = this.validateAPIKey(apiConfig.apiKey, "Anthropic");
      if (keyResult.isErr()) {
        return err(new AgentError(keyResult.error.message));
      }

      const agentConfig = {
        id: config.id || this.generateAgentId("anthropic", config.name),
        name: config.name || "Anthropic-Claude",
        provider: "anthropic" as const,
        ...config.parameters,
        apiKey: apiConfig.apiKey,
        baseURL: apiConfig.baseURL,
        timeout: apiConfig.timeout,
        model: config.parameters.model || "claude-3-haiku-20240307",
        temperature: config.parameters.temperature || 0.7,
        maxTokens: config.parameters.maxTokens || 1000,
      };

      const { AnthropicAgent } = await import("../agents/web/anthropic-agent");
      const agent = new AnthropicAgent(agentConfig);

      const validationResult = await this.validateAgentAfterCreation(
        agent,
        context
      );
      if (validationResult.isErr()) {
        return validationResult;
      }

      this.logger.info("Anthropic agent created successfully", {
        agentId: agent.id,
        model: agentConfig.model,
        contextId: context.factoryId,
      });

      return ok(agent);
    } catch (error) {
      this.logger.error("Failed to create Anthropic agent", error);
      return err(new AgentError(`Anthropic agent creation failed: ${error}`));
    }
  }

  getDefaultConfig(): Partial<AgentFactoryConfig> {
    return {
      type: AgentType.ANTHROPIC,
      enabled: true,
      weight: 1.0,
      parameters: {
        model: "claude-3-haiku-20240307",
        temperature: 0.7,
        maxTokens: 1000,
      },
    };
  }
}

/**
 * Google agent factory
 */
export class GoogleAgentFactory extends BaseAgentFactory {
  constructor() {
    super(AgentType.GOOGLE, "Google");
  }

  async create(
    config: AgentFactoryConfig,
    context: AgentCreationContext
  ): Promise<Result<Agent, AgentError>> {
    try {
      const configResult = this.validateConfig(config);
      if (configResult.isErr()) {
        return err(new AgentError(configResult.error.message));
      }

      const apiConfigResult = EnhancedEnvironmentConfig.getAPIConfig("google");
      if (apiConfigResult.isErr()) {
        return err(
          new AgentError(
            `Failed to get Google API config: ${apiConfigResult.error.message}`
          )
        );
      }

      const apiConfig = apiConfigResult.unwrap();
      const keyResult = this.validateAPIKey(apiConfig.apiKey, "Google");
      if (keyResult.isErr()) {
        return err(new AgentError(keyResult.error.message));
      }

      const agentConfig = {
        id: config.id || this.generateAgentId("google", config.name),
        name: config.name || "Google-Gemini",
        provider: "google" as const,
        ...config.parameters,
        apiKey: apiConfig.apiKey,
        baseURL: apiConfig.baseURL,
        timeout: apiConfig.timeout,
        model: config.parameters.model || "gemini-1.5-flash",
        temperature: config.parameters.temperature || 0.7,
        maxTokens: config.parameters.maxTokens || 1000,
      };

      const { GoogleAgent } = await import("../agents/web/google-agent");
      const agent = new GoogleAgent(agentConfig);

      const validationResult = await this.validateAgentAfterCreation(
        agent,
        context
      );
      if (validationResult.isErr()) {
        return validationResult;
      }

      this.logger.info("Google agent created successfully", {
        agentId: agent.id,
        model: agentConfig.model,
        contextId: context.factoryId,
      });

      return ok(agent);
    } catch (error) {
      this.logger.error("Failed to create Google agent", error);
      return err(new AgentError(`Google agent creation failed: ${error}`));
    }
  }

  getDefaultConfig(): Partial<AgentFactoryConfig> {
    return {
      type: AgentType.GOOGLE,
      enabled: true,
      weight: 1.0,
      parameters: {
        model: "gemini-1.5-flash",
        temperature: 0.7,
        maxTokens: 1000,
      },
    };
  }
}

/**
 * Main agent factory manager
 */
export class AgentFactoryManager {
  private factories = new Map<AgentType, AgentFactory>();
  private logger: Logger;
  private creationContext: AgentCreationContext;

  constructor() {
    this.logger = new Logger("AgentFactoryManager");
    this.creationContext = {
      factoryId: this.generateFactoryId(),
      timestamp: Date.now(),
      environment: process.env,
      validationLevel: ValidationLevel.BASIC,
    };

    // Register default factories
    this.registerFactory(new OpenAIAgentFactory());
    this.registerFactory(new AnthropicAgentFactory());
    this.registerFactory(new GoogleAgentFactory());

    this.logger.info("Agent factory manager initialized", {
      factoryCount: this.factories.size,
      supportedTypes: Array.from(this.factories.keys()),
    });
  }

  /**
   * Register a new agent factory
   */
  registerFactory(factory: AgentFactory): void {
    this.factories.set(factory.type, factory);
    this.logger.debug(`Registered factory for ${factory.type}`, {
      factoryName: factory.name,
    });
  }

  /**
   * Create an agent using the appropriate factory
   */
  async createAgent(
    config: AgentFactoryConfig
  ): Promise<Result<Agent, AgentError>> {
    const factory = this.factories.get(config.type);
    if (!factory) {
      return err(
        new AgentError(`No factory registered for agent type: ${config.type}`)
      );
    }

    if (!factory.canCreate(config.type)) {
      return err(
        new AgentError(`Factory cannot create agent of type: ${config.type}`)
      );
    }

    this.logger.debug("Creating agent", {
      type: config.type,
      factoryName: factory.name,
    });

    const result = await factory.create(config, this.creationContext);

    if (result.isOk()) {
      this.logger.info("Agent created successfully", {
        agentId: result.unwrap().id,
        type: config.type,
        factory: factory.name,
      });
    } else {
      this.logger.error("Agent creation failed", {
        type: config.type,
        error: result.error?.message || "Unknown error",
      });
    }

    return result;
  }

  /**
   * Create multiple agents from configurations
   */
  async createAgents(
    configs: AgentFactoryConfig[]
  ): Promise<Result<Agent[], AgentError[]>> {
    const results: Array<Result<Agent, AgentError>> = [];

    for (const config of configs) {
      if (config.enabled) {
        const result = await this.createAgent(config);
        results.push(result);
      } else {
        this.logger.debug(`Skipping disabled agent: ${config.type}`);
      }
    }

    // Separate successes and failures
    const successes: Agent[] = [];
    const failures: AgentError[] = [];

    for (const result of results) {
      if (result.isOk()) {
        successes.push(result.unwrap());
      } else if (result.error) {
        failures.push(result.error);
      }
    }

    if (failures.length > 0) {
      this.logger.warn(
        `Agent creation completed with ${failures.length} failures`,
        {
          successCount: successes.length,
          failureCount: failures.length,
        }
      );
      return err(failures);
    }

    return ok(successes);
  }

  /**
   * Get available agent types
   */
  getAvailableTypes(): AgentType[] {
    return Array.from(this.factories.keys());
  }

  /**
   * Get default configuration for an agent type
   */
  getDefaultConfig(
    type: AgentType
  ): Result<Partial<AgentFactoryConfig>, AgentError> {
    const factory = this.factories.get(type);
    if (!factory) {
      return err(
        new AgentError(`No factory registered for agent type: ${type}`)
      );
    }

    return ok(factory.getDefaultConfig());
  }

  /**
   * Set validation level for agent creation
   */
  setValidationLevel(level: ValidationLevel): void {
    this.creationContext.validationLevel = level;
    this.logger.info(`Validation level set to: ${level}`);
  }

  /**
   * Get factory statistics
   */
  getStatistics(): FactoryStatistics {
    return {
      factoryCount: this.factories.size,
      supportedTypes: Array.from(this.factories.keys()),
      creationContext: this.creationContext,
      uptime: Date.now() - this.creationContext.timestamp,
    };
  }

  private generateFactoryId(): string {
    return `factory_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
}

/**
 * Factory statistics interface
 */
export interface FactoryStatistics {
  factoryCount: number;
  supportedTypes: AgentType[];
  creationContext: AgentCreationContext;
  uptime: number;
}

/**
 * Global agent factory manager instance
 */
export const agentFactory = new AgentFactoryManager();

/**
 * Convenience function to create an agent
 */
export async function createAgent(
  config: AgentFactoryConfig
): Promise<Result<Agent, AgentError>> {
  return agentFactory.createAgent(config);
}

/**
 * Convenience function to create multiple agents
 */
export async function createAgents(
  configs: AgentFactoryConfig[]
): Promise<Result<Agent[], AgentError[]>> {
  return agentFactory.createAgents(configs);
}
