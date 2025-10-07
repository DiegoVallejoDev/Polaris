/**
 * Anthropic Claude Agent Implementation
 */

import { BaseAgent } from "../base/agent";
import { GameState } from "../../domains/base/game-state";
import { Action } from "../../domains/base/action";
import { EvaluationResult } from "../../types/evaluation";
import { WebAPIConfig } from "../base/parameters";
import { Logger } from "../../utils/logger";
import { EnvironmentConfig } from "../../utils/config";
import { PolarisError } from "../../errors/base";
import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";

export const DEFAULT_ANTHROPIC_NAME = "Claude Sonnet 4.5 ";
export const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-5";

/**
 * Anthropic-specific configuration
 */
export interface AnthropicConfig extends WebAPIConfig {
  model: string;
  maxTokens: number;
  systemPrompt?: string;
}

/**
 * Anthropic-specific configuration that extends with role and task awareness
 */
export interface AnthropicAgentConfig extends AnthropicConfig {
  role: import("../../types/task").AgentRole;
  task: import("../../types/task").PolarisEngineTask;
}

/**
 * Anthropic Claude Agent for game state evaluation
 */
export class AnthropicAgent extends BaseAgent {
  private config: AnthropicConfig;
  private client: Anthropic;
  private systemPrompt: string;
  private logger: Logger;

  constructor(config: AnthropicAgentConfig) {
    // Generate ID if not provided
    const agentId = config.id || BaseAgent.generateAgentId("Anthropic");

    const baseConfig: AnthropicConfig = {
      ...config,
      id: agentId,
      name: config.name || DEFAULT_ANTHROPIC_NAME,
      provider: "anthropic",
      model: config.model || DEFAULT_ANTHROPIC_MODEL,
      maxTokens: config.maxTokens || 1000,
    };

    super({
      id: agentId,
      name: config.name || DEFAULT_ANTHROPIC_NAME,
      type: "anthropic",
      role: config.role,
      task: config.task,
      parameters: {
        ...baseConfig,
        provider: "anthropic",
      },
    });

    this.config = baseConfig;

    // Initialize Anthropic client
    this.client = new Anthropic({
      apiKey: this.config.apiKey,
    });

    this.systemPrompt =
      this.config.systemPrompt || this.getDefaultSystemPrompt();
    this.logger = new Logger(
      `AnthropicAgent-${this.id}`,
      EnvironmentConfig.POLARIS.logLevel
    );

    this.logger.info("Anthropic agent created", {
      model: this.config.model,
      maxTokens: this.config.maxTokens,
      role: this.role.name,
      task: this.task.name,
    });
  }

  override async initialize(): Promise<void> {
    try {
      // Test API connection (non-blocking)
      try {
        await this.testConnection();
        this.logger.info("Anthropic agent initialized successfully");
      } catch (testError) {
        // Log warning but continue initialization
        this.logger.warn(
          "Anthropic API connection test failed (agent will retry on first use)",
          testError
        );
      }

      this.ready = true;
      await super.initialize();
    } catch (error) {
      this.logger.errorSafe("Failed to initialize Anthropic agent", error);
      throw new PolarisError(
        `Anthropic agent initialization failed: ${error}`,
        "AGENT_INIT_FAILED",
        { agentId: this.id, config: this.config }
      );
    }
  }

  async evaluate(
    gameState: GameState,
    actions?: Action[]
  ): Promise<import("../../types/agent-output").AgentOutput> {
    if (!this.isReady()) {
      throw new PolarisError("Anthropic agent not ready");
    }

    const startTime = performance.now();

    try {
      // Prepare the evaluation prompt using the new role/task-aware method
      const prompt = this.buildPrompt(gameState, actions);

      // Make API call to Anthropic
      const messages: MessageParam[] = [
        {
          role: "user",
          content: prompt,
        },
      ];

      const anthropicResponse = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        system: this.systemPrompt,
        messages,
      });

      this.logger.debug("Anthropic API response received", anthropicResponse);

      const evaluation = this.parseEvaluationResponse(anthropicResponse);
      const processingTime = performance.now() - startTime;
      evaluation.evaluationTime = processingTime;

      // Create unified agent output
      const output = this.createAgentOutput(
        evaluation,
        processingTime,
        this.config.model,
        anthropicResponse.usage.input_tokens +
          anthropicResponse.usage.output_tokens
      );

      // Update statistics
      this.updateStatisticsFromOutput(output);

      this.logger.debug("Anthropic evaluation completed", {
        gameStateId: gameState.id,
        processingTime,
        confidence: evaluation.confidence,
        tokensUsed:
          anthropicResponse.usage.input_tokens +
          anthropicResponse.usage.output_tokens,
      });

      return output;
    } catch (error) {
      this.statistics.errorCount++;
      this.logger.errorSafe("Anthropic evaluation failed", error);

      let errorMessage = String(error);
      let errorMetadata: any = { error: true };

      if (error instanceof Anthropic.APIError) {
        errorMessage = `Anthropic API Error: ${error.message}`;
        errorMetadata = {
          ...errorMetadata,
          status: error.status,
        };
      } else if (error instanceof Anthropic.APIConnectionError) {
        errorMessage = `Anthropic Connection Error: ${error.message}`;
        errorMetadata.connectionError = true;
      } else if (error instanceof Anthropic.RateLimitError) {
        errorMessage = `Anthropic Rate Limit Error: ${error.message}`;
        errorMetadata.rateLimited = true;
      }

      // Create error evaluation
      const fallbackEvaluation: EvaluationResult = {
        agentId: this.id,
        score: 0.5, // Neutral score
        confidence: 0.1, // Low confidence
        reasoning: `Evaluation failed: ${errorMessage}`,
        metadata: {
          ...errorMetadata,
          errorMessage,
          evaluationTime: performance.now() - startTime,
        },
      };

      // Return error output
      return this.createAgentOutput(
        fallbackEvaluation,
        performance.now() - startTime,
        this.config.model,
        0,
        {
          hasError: true,
          message: errorMessage,
          type: errorMetadata.rateLimited
            ? "ANTHROPIC_RATE_LIMIT_ERROR"
            : "ANTHROPIC_API_ERROR",
        }
      );
    }
  }

  async selectAction(_state: GameState, actions: Action[]): Promise<Action> {
    // For now, return the first action as this is primarily an evaluation agent
    // In a full implementation, this would use Claude to select the best action
    if (actions.length === 0) {
      throw new PolarisError("No actions available for selection");
    }

    this.logger.debug(
      "Action selection not implemented, returning first action"
    );
    return actions[0];
  }

  clone(): AnthropicAgent {
    return new AnthropicAgent({
      ...this.config,
      role: this.role,
      task: this.task,
    } as AnthropicAgentConfig);
  }

  override async cleanup(): Promise<void> {
    this.ready = false;
    this.logger.info("Anthropic agent cleaned up");
    await super.cleanup();
  }

  // Private helper methods

  private async testConnection(): Promise<void> {
    try {
      // Anthropic doesn't have a simple models endpoint, so we make a minimal request
      // Using max_tokens: 1 to minimize cost and time
      await this.client.messages.create({
        model: this.config.model,
        max_tokens: 1,
        messages: [
          {
            role: "user",
            content: "test",
          },
        ],
      });
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        throw new PolarisError(
          `Anthropic API connection test failed: ${error.message}`,
          "ANTHROPIC_API_ERROR",
          { status: error.status }
        );
      }
      throw new PolarisError(
        `Anthropic API connection test failed: ${error instanceof Error ? error.message : String(error)}`,
        "ANTHROPIC_CONNECTION_ERROR"
      );
    }
  }

  private parseEvaluationResponse(
    response: Anthropic.Messages.Message
  ): EvaluationResult {
    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );
    const rawContent = textBlock?.text || "";

    try {
      if (!rawContent) {
        throw new Error("No response content received");
      }

      const normalizedContent = this.extractJsonPayload(rawContent);
      const parsed = JSON.parse(normalizedContent);

      return {
        agentId: this.id,
        score: this.validateScore(parsed.score),
        confidence: this.validateConfidence(parsed.confidence),
        reasoning: parsed.reasoning || "No reasoning provided",
        metadata: {
          keyFactors: parsed.keyFactors || [],
          recommendedActions: parsed.recommendedActions || [],
          tacticalThemes: parsed.tacticalThemes || [],
          positionType: parsed.positionType || "unknown",
          riskAssessment: parsed.riskAssessment || "medium",
          tokensUsed:
            (response.usage.input_tokens || 0) +
            (response.usage.output_tokens || 0),
          model: this.config.model,
        },
      };
    } catch (error) {
      this.logger.warn(
        "Failed to parse Anthropic response, using fallback",
        error
      );

      return {
        agentId: this.id,
        score: 0.5,
        confidence: 0.3,
        reasoning: `Failed to parse response: ${error}`,
        metadata: {
          parseError: true,
          rawResponse: rawContent || undefined,
        },
      };
    }
  }

  private extractJsonPayload(content: string): string {
    const trimmed = content.trim();

    // Prefer content inside JSON code fences when present
    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fencedMatch && fencedMatch[1]) {
      return fencedMatch[1].trim();
    }

    // Fall back to extracting the first JSON object found in the text
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return trimmed.slice(firstBrace, lastBrace + 1).trim();
    }

    return trimmed;
  }

  private validateScore(score: any): number {
    const numScore = Number(score);
    if (isNaN(numScore) || numScore < 0 || numScore > 1) {
      this.logger.warn(`Invalid score received: ${score}, using default 0.5`);
      return 0.5;
    }
    return numScore;
  }

  private validateConfidence(confidence: any): number {
    const numConfidence = Number(confidence);
    if (isNaN(numConfidence) || numConfidence < 0 || numConfidence > 1) {
      this.logger.warn(
        `Invalid confidence received: ${confidence}, using default 0.5`
      );
      return 0.5;
    }
    return numConfidence;
  }

  private getDefaultSystemPrompt(): string {
    return `You are Claude, an expert AI assistant specializing in analysis and evaluation. You have been assigned a specific role and task context that should guide your analysis.

Your core capabilities:
1. Analyze situations objectively and thoroughly
2. Consider multiple perspectives and factors
3. Provide numerical evaluations with clear reasoning
4. Explain your thought process clearly and concisely
5. Identify key patterns and strategic elements

Always respond in valid JSON format as requested. Your evaluations should be:
- Accurate and well-reasoned
- Consistent in scoring methodology
- Aligned with your assigned role's perspective
- Helpful for decision-making processes
- Focused on the most relevant factors for the given domain

Remember: A score of 0.5 represents neutral/balanced situations, above 0.5 indicates favorable outcomes for the current position/player, below 0.5 indicates unfavorable outcomes.

Pay special attention to your role-specific instructions and perspective when analyzing each situation.`;
  }
}
