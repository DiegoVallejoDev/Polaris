/**
 * Ergonomic agent factory for creating agents with role and task awareness
 */

import { OpenAIAgent, OpenAIAgentConfig } from "../web/openai-agent";
import { AnthropicAgent, AnthropicAgentConfig } from "../web/anthropic-agent";
import { GoogleAgent, GoogleAgentConfig } from "../web/google-agent";
import { PolarisEngineTask, AgentRole } from "../../types/task";
import { Agent } from "../base/agent";
import { PolarisError } from "../../errors/base";

/**
 * Configuration for creating agents with ergonomic factory functions
 */
export interface AgentFactoryConfig {
  /** Role for the agent */
  role: AgentRole;

  /** Task context */
  task: PolarisEngineTask;

  /** Model to use */
  model: string;

  /** API key (optional, can use environment) */
  apiKey?: string;

  /** Agent name (optional, defaults based on role and model) */
  name?: string;

  /** Maximum tokens */
  maxTokens?: number;

  /** Temperature for randomness */
  temperature?: number;

  /** Custom system prompt */
  systemPrompt?: string;

  /** Additional configuration */
  additionalConfig?: Record<string, any>;
}

/**
 * Create an OpenAI agent with ergonomic configuration
 */
export function openAiAgent(config: AgentFactoryConfig): OpenAIAgent {
  const agentConfig: OpenAIAgentConfig = {
    role: config.role,
    task: config.task,
    name: config.name || `${config.role.name} (${config.model})`,
    model: config.model,
    maxTokens: config.maxTokens || 1000,
    temperature: config.temperature || 0.7,
    provider: "openai",
    apiKey: config.apiKey || "", // Will use environment if not provided
    ...config.additionalConfig,
  };

  if (config.systemPrompt !== undefined) {
    agentConfig.systemPrompt = config.systemPrompt;
  }

  return new OpenAIAgent(agentConfig);
}

/**
 * Create an Anthropic agent with ergonomic configuration
 */
export function anthropicAgent(config: AgentFactoryConfig): AnthropicAgent {
  const agentConfig: AnthropicAgentConfig = {
    role: config.role,
    task: config.task,
    name: config.name || `${config.role.name} (${config.model})`,
    model: config.model,
    maxTokens: config.maxTokens || 1000,
    provider: "anthropic",
    apiKey: config.apiKey || "", // Will use environment if not provided
    ...config.additionalConfig,
  };

  if (config.systemPrompt !== undefined) {
    agentConfig.systemPrompt = config.systemPrompt;
  }

  return new AnthropicAgent(agentConfig);
}

/**
 * Create a Google agent with ergonomic configuration
 */
export function googleAgent(config: AgentFactoryConfig): GoogleAgent {
  const agentConfig: GoogleAgentConfig = {
    role: config.role,
    task: config.task,
    name: config.name || `${config.role.name} (${config.model})`,
    model: config.model,
    maxTokens: config.maxTokens || 1000,
    temperature: config.temperature || 0.7,
    provider: "google",
    apiKey: config.apiKey || "", // Will use environment if not provided
    ...config.additionalConfig,
  };

  if (config.systemPrompt !== undefined) {
    agentConfig.systemPrompt = config.systemPrompt;
  }

  return new GoogleAgent(agentConfig);
}

/**
 * Agent type enumeration for factory selection
 */
export enum AgentProvider {
  OPENAI = "openai",
  ANTHROPIC = "anthropic",
  GOOGLE = "google",
}

/**
 * Create an agent using the specified provider
 */
export function createAgent(
  provider: AgentProvider,
  config: AgentFactoryConfig
): Agent {
  switch (provider) {
    case AgentProvider.OPENAI:
      return openAiAgent(config);
    case AgentProvider.ANTHROPIC:
      return anthropicAgent(config);
    case AgentProvider.GOOGLE:
      return googleAgent(config);
    default:
      throw new PolarisError(`Unsupported agent provider: ${provider}`);
  }
}

/**
 * Bulk agent creation utility
 */
export interface BulkAgentConfig {
  task: PolarisEngineTask;
  agents: Array<{
    provider: AgentProvider;
    role: AgentRole;
    model: string;
    name?: string;
    apiKey?: string;
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;
    additionalConfig?: Record<string, any>;
  }>;
}

/**
 * Create multiple agents from bulk configuration
 */
export function createAgents(config: BulkAgentConfig): Agent[] {
  return config.agents.map((agentConfig) => {
    const factoryConfig: AgentFactoryConfig = {
      role: agentConfig.role,
      task: config.task,
      model: agentConfig.model,
    };

    if (agentConfig.name !== undefined) factoryConfig.name = agentConfig.name;
    if (agentConfig.apiKey !== undefined)
      factoryConfig.apiKey = agentConfig.apiKey;
    if (agentConfig.maxTokens !== undefined)
      factoryConfig.maxTokens = agentConfig.maxTokens;
    if (agentConfig.temperature !== undefined)
      factoryConfig.temperature = agentConfig.temperature;
    if (agentConfig.systemPrompt !== undefined)
      factoryConfig.systemPrompt = agentConfig.systemPrompt;
    if (agentConfig.additionalConfig !== undefined)
      factoryConfig.additionalConfig = agentConfig.additionalConfig;

    return createAgent(agentConfig.provider, factoryConfig);
  });
}

/**
 * Quick agent creation helpers with common model configurations
 */
export const QuickAgents = {
  /**
   * Create GPT-4o agent
   */
  gpt4o: (role: AgentRole, task: PolarisEngineTask, apiKey?: string) => {
    const config: AgentFactoryConfig = {
      role,
      task,
      model: "gpt-4o",
      maxTokens: 1500,
      temperature: 0.7,
    };
    if (apiKey !== undefined) config.apiKey = apiKey;
    return openAiAgent(config);
  },

  /**
   * Create GPT-4o-mini agent
   */
  gpt4oMini: (role: AgentRole, task: PolarisEngineTask, apiKey?: string) => {
    const config: AgentFactoryConfig = {
      role,
      task,
      model: "gpt-4o-mini",
      maxTokens: 1000,
      temperature: 0.7,
    };
    if (apiKey !== undefined) config.apiKey = apiKey;
    return openAiAgent(config);
  },

  /**
   * Create Claude Sonnet agent
   */
  claudeSonnet: (role: AgentRole, task: PolarisEngineTask, apiKey?: string) => {
    const config: AgentFactoryConfig = {
      role,
      task,
      model: "claude-3-5-sonnet-20241022",
      maxTokens: 1500,
      temperature: 0.7,
    };
    if (apiKey !== undefined) config.apiKey = apiKey;
    return anthropicAgent(config);
  },

  /**
   * Create Claude Haiku agent
   */
  claudeHaiku: (role: AgentRole, task: PolarisEngineTask, apiKey?: string) => {
    const config: AgentFactoryConfig = {
      role,
      task,
      model: "claude-3-haiku-20240307",
      maxTokens: 1000,
      temperature: 0.7,
    };
    if (apiKey !== undefined) config.apiKey = apiKey;
    return anthropicAgent(config);
  },

  /**
   * Create Gemini Pro agent
   */
  geminiPro: (role: AgentRole, task: PolarisEngineTask, apiKey?: string) => {
    const config: AgentFactoryConfig = {
      role,
      task,
      model: "gemini-1.5-pro",
      maxTokens: 1500,
      temperature: 0.7,
    };
    if (apiKey !== undefined) config.apiKey = apiKey;
    return googleAgent(config);
  },

  /**
   * Create Gemini Flash agent
   */
  geminiFlash: (role: AgentRole, task: PolarisEngineTask, apiKey?: string) => {
    const config: AgentFactoryConfig = {
      role,
      task,
      model: "gemini-1.5-flash",
      maxTokens: 1000,
      temperature: 0.7,
    };
    if (apiKey !== undefined) config.apiKey = apiKey;
    return googleAgent(config);
  },
};

/**
 * Agent ensemble builder for creating diverse agent teams
 */
export class AgentEnsembleBuilder {
  private agents: Agent[] = [];
  private task: PolarisEngineTask;

  constructor(task: PolarisEngineTask) {
    this.task = task;
  }

  /**
   * Add an agent using the factory
   */
  add(
    provider: AgentProvider,
    role: AgentRole,
    model: string,
    config?: Partial<AgentFactoryConfig>
  ): this {
    const agent = createAgent(provider, {
      role,
      task: this.task,
      model,
      ...config,
    });
    this.agents.push(agent);
    return this;
  }

  /**
   * Add multiple agents for different roles using the same model/provider
   */
  addRoles(
    provider: AgentProvider,
    model: string,
    roles: AgentRole[],
    config?: Partial<AgentFactoryConfig>
  ): this {
    for (const role of roles) {
      this.add(provider, role, model, config);
    }
    return this;
  }

  /**
   * Add a diverse team with different providers for the same role
   */
  addDiverseRole(
    role: AgentRole,
    configs: Array<{
      provider: AgentProvider;
      model: string;
      config?: Partial<AgentFactoryConfig>;
    }>
  ): this {
    for (const agentConfig of configs) {
      this.add(
        agentConfig.provider,
        role,
        agentConfig.model,
        agentConfig.config
      );
    }
    return this;
  }

  /**
   * Build and return the agent ensemble
   */
  build(): Agent[] {
    if (this.agents.length === 0) {
      throw new PolarisError("Agent ensemble must contain at least one agent");
    }
    return [...this.agents];
  }

  /**
   * Get current agent count
   */
  count(): number {
    return this.agents.length;
  }

  /**
   * Clear all agents
   */
  clear(): this {
    this.agents = [];
    return this;
  }
}

/**
 * Create agent ensemble builder
 */
export function createEnsemble(task: PolarisEngineTask): AgentEnsembleBuilder {
  return new AgentEnsembleBuilder(task);
}
