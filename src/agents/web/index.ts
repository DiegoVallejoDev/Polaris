/**
 * Web API Agents - Entry point for LLM-powered agents
 */

export { OpenAIAgent, type OpenAIConfig } from "./openai-agent";
export { AnthropicAgent, type AnthropicConfig } from "./anthropic-agent";
export { GoogleAgent, type GoogleConfig } from "./google-agent";

/**
 * Agent factory for creating web API agents
 */
import { OpenAIAgent, OpenAIConfig } from "./openai-agent";
import { AnthropicAgent, AnthropicConfig } from "./anthropic-agent";
import { GoogleAgent, GoogleConfig } from "./google-agent";
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
          name: config.name || "OpenAI-GPT",
          provider: "openai",
          apiKey: config.apiKey || EnvironmentConfig.OPENAI.apiKey,
          model: config.model || "gpt-3.5-turbo",
          temperature: config.temperature || 0.7,
          maxTokens: config.maxTokens || 1000,
          systemPrompt: config.systemPrompt,
        } as OpenAIConfig);

      case "anthropic":
        return new AnthropicAgent({
          id: config.id,
          name: config.name || "Claude-3",
          provider: "anthropic",
          apiKey: config.apiKey || EnvironmentConfig.ANTHROPIC.apiKey,
          model: config.model || "claude-3-haiku-20240307",
          maxTokens: config.maxTokens || 1000,
          systemPrompt: config.systemPrompt,
        } as AnthropicConfig);

      case "google":
        return new GoogleAgent({
          id: config.id,
          name: config.name || "Gemini-2.0-Flash",
          provider: "google",
          apiKey: config.apiKey || EnvironmentConfig.GOOGLE.apiKey,
          model: config.model || "gemini-2.0-flash",
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
            name: "GPT-4-Chess-Analyst",
          })
        );
      }

      // Create Anthropic agent if API key is available
      if (EnvironmentConfig.ANTHROPIC.apiKey) {
        agents.push(
          this.createAgent({
            provider: "anthropic",
            name: "Claude-Chess-Expert",
          })
        );
      }

      // Create Google agent if API key is available
      if (EnvironmentConfig.GOOGLE.apiKey) {
        agents.push(
          this.createAgent({
            provider: "google",
            name: "Gemini-Chess-Advisor",
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
