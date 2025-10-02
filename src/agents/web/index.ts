/**
 * Web API Agents - Entry point for LLM-powered agents
 */

export {
  OpenAIAgent,
  type OpenAIConfig,
  DEFAULT_OPENAI_MODEL,
  DEFAULT_OPENAI_NAME,
} from "./openai-agent";
export {
  AnthropicAgent,
  type AnthropicConfig,
  DEFAULT_ANTHROPIC_MODEL,
  DEFAULT_ANTHROPIC_NAME,
} from "./anthropic-agent";
export {
  GoogleAgent,
  type GoogleConfig,
  DEFAULT_GOOGLE_MODEL,
  DEFAULT_GOOGLE_NAME,
} from "./google-agent";

/**
 * Agent factory for creating web API agents
 */
import {
  OpenAIAgent,
  OpenAIConfig,
  DEFAULT_OPENAI_MODEL,
  DEFAULT_OPENAI_NAME,
} from "./openai-agent";
import {
  AnthropicAgent,
  AnthropicConfig,
  DEFAULT_ANTHROPIC_MODEL,
  DEFAULT_ANTHROPIC_NAME,
} from "./anthropic-agent";
import {
  GoogleAgent,
  GoogleConfig,
  DEFAULT_GOOGLE_MODEL,
  DEFAULT_GOOGLE_NAME,
} from "./google-agent";
import { Agent } from "../base/agent";
import { EnvironmentConfig } from "../../utils/config";
import { PolarisError } from "../../errors/base";

/**
 * Configuration for creating web agents
 */
export interface WebAgentFactoryConfig {
  provider: "openai" | "anthropic" | "google";
  id?: string;
  name?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  apiKey?: string;
}

/**
 * Factory class for creating web API agents
 */
export class WebAgentFactory {
  /**
   * Create a new web API agent based on the provider
   */
  static createAgent(config: WebAgentFactoryConfig): Agent {
    // Validate API keys are available
    const validation = EnvironmentConfig.validateAPIKeys();
    if (!validation.valid) {
      throw new PolarisError(
        `Missing API keys: ${validation.missing.join(", ")}`,
        "MISSING_API_KEYS"
      );
    }

    switch (config.provider) {
      case "openai":
        return new OpenAIAgent({
          id: config.id,
          name: config.name || DEFAULT_OPENAI_NAME,
          provider: "openai",
          apiKey: config.apiKey || EnvironmentConfig.OPENAI.apiKey,
          model: config.model || DEFAULT_OPENAI_MODEL,
          temperature: config.temperature || 0.7,
          maxTokens: config.maxTokens || 1000,
          systemPrompt: config.systemPrompt,
        } as OpenAIConfig);

      case "anthropic":
        return new AnthropicAgent({
          id: config.id,
          name: config.name || DEFAULT_ANTHROPIC_NAME,
          provider: "anthropic",
          apiKey: config.apiKey || EnvironmentConfig.ANTHROPIC.apiKey,
          model: config.model || DEFAULT_ANTHROPIC_MODEL,
          maxTokens: config.maxTokens || 1000,
          systemPrompt: config.systemPrompt,
        } as AnthropicConfig);

      case "google":
        return new GoogleAgent({
          id: config.id,
          name: config.name || DEFAULT_GOOGLE_NAME,
          provider: "google",
          apiKey: config.apiKey || EnvironmentConfig.GOOGLE.apiKey,
          model: config.model || DEFAULT_GOOGLE_MODEL,
          temperature: config.temperature || 0.7,
          maxTokens: config.maxTokens || 1000,
          systemPrompt: config.systemPrompt,
        } as GoogleConfig);

      default:
        throw new PolarisError(
          `Unknown web agent provider: ${config.provider}`,
          "INVALID_PROVIDER"
        );
    }
  }

  /**
   * Create multiple agents with default configurations
   */
  static createDefaultAgents(): Agent[] {
    const agents: Agent[] = [];

    try {
      // Create OpenAI agent if API key is available
      if (EnvironmentConfig.OPENAI.apiKey) {
        agents.push(
          this.createAgent({
            provider: "openai",
            name: "GPT-4o-Chess-Analyst",
            model: DEFAULT_OPENAI_MODEL,
          })
        );
      }

      // Create Anthropic agent if API key is available
      if (EnvironmentConfig.ANTHROPIC.apiKey) {
        agents.push(
          this.createAgent({
            provider: "anthropic",
            name: "Claude-Chess-Expert",
            model: DEFAULT_ANTHROPIC_MODEL,
          })
        );
      }

      // Create Google agent if API key is available
      if (EnvironmentConfig.GOOGLE.apiKey) {
        agents.push(
          this.createAgent({
            provider: "google",
            name: "Gemini-Chess-Advisor",
            model: DEFAULT_GOOGLE_MODEL,
          })
        );
      }

      if (agents.length === 0) {
        throw new PolarisError(
          "No API keys available for web agents",
          "NO_API_KEYS"
        );
      }

      return agents;
    } catch (error) {
      throw new PolarisError(
        `Failed to create default agents: ${error}`,
        "AGENT_CREATION_FAILED"
      );
    }
  }

  /**
   * Get available providers based on configured API keys
   */
  static getAvailableProviders(): string[] {
    const providers: string[] = [];

    if (EnvironmentConfig.OPENAI.apiKey) {
      providers.push("openai");
    }

    if (EnvironmentConfig.ANTHROPIC.apiKey) {
      providers.push("anthropic");
    }

    if (EnvironmentConfig.GOOGLE.apiKey) {
      providers.push("google");
    }

    return providers;
  }

  /**
   * Check if a specific provider is available
   */
  static isProviderAvailable(
    provider: "openai" | "anthropic" | "google"
  ): boolean {
    switch (provider) {
      case "openai":
        return !!EnvironmentConfig.OPENAI.apiKey;
      case "anthropic":
        return !!EnvironmentConfig.ANTHROPIC.apiKey;
      case "google":
        return !!EnvironmentConfig.GOOGLE.apiKey;
      default:
        return false;
    }
  }
}
