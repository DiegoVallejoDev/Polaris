/**
 * OpenAI GPT Agent Implementation
 */

import { BaseAgent } from "../base/agent";
import { GameState } from "../../domains/base/game-state";
import { Action } from "../../domains/base/action";
import { EvaluationResult } from "../../types/evaluation";
import { WebAPIConfig } from "../base/parameters";
import { Logger } from "../../utils/logger";
import { EnvironmentConfig } from "../../utils/config";

import { PolarisError } from "../../errors/base";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export const DEFAULT_OPENAI_NAME = "GPT-4o";
export const DEFAULT_OPENAI_MODEL = "gpt-4o";

/**
 * OpenAI-specific configuration
 */
export interface OpenAIConfig extends WebAPIConfig {
  model: string;
  maxTokens: number;
  temperature?: number;
  systemPrompt?: string;
}

/**
 * OpenAI GPT Agent for game state evaluation
 */
/**
 * OpenAI-specific configuration that extends with role and task awareness
 */
export interface OpenAIAgentConfig extends OpenAIConfig {
  role: import("../../types/task").AgentRole;
  task: import("../../types/task").PolarisEngineTask;
}

export class OpenAIAgent extends BaseAgent {
  private config: OpenAIConfig;
  private client: OpenAI;
  private systemPrompt: string;
  private logger: Logger;

  constructor(config: OpenAIAgentConfig) {
    // Generate ID if not provided
    const agentId = config.id || BaseAgent.generateAgentId("OpenAI");

    const baseConfig: OpenAIConfig = {
      ...config,
      id: agentId,
      name: config.name || DEFAULT_OPENAI_NAME,
      provider: "openai",
      apiKey: config.apiKey || EnvironmentConfig.OPENAI.apiKey,
      model: config.model || DEFAULT_OPENAI_MODEL,
      maxTokens: config.maxTokens || 1000,
      temperature: config.temperature || 0.7,
    };

    super({
      id: agentId,
      name: config.name || DEFAULT_OPENAI_NAME,
      type: "openai",
      role: config.role,
      task: config.task,
      parameters: {
        ...baseConfig,
        provider: "openai",
      },
    });

    this.config = baseConfig;

    // Initialize OpenAI client
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      organization:
        this.config.organizationId || EnvironmentConfig.OPENAI.organizationId,
      timeout: EnvironmentConfig.OPENAI.timeout || 30000,
      maxRetries: EnvironmentConfig.OPENAI.maxRetries || 3,
    });

    this.systemPrompt = config.systemPrompt || this.getDefaultSystemPrompt();
    this.logger = new Logger(
      `OpenAIAgent-${this.id}`,
      EnvironmentConfig.POLARIS.logLevel
    );

    this.logger.info("OpenAI agent created", {
      model: this.config.model,
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature,
      role: this.role.name,
      task: this.task.name,
    });
  }

  override async initialize(): Promise<void> {
    try {
      // Test API connection
      await this.testConnection();
      this.ready = true;
      this.logger.info("OpenAI agent initialized successfully");
      await super.initialize();
    } catch (error) {
      this.logger.errorSafe("Failed to initialize OpenAI agent", error);
      throw new PolarisError(
        `OpenAI agent initialization failed: ${error}`,
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
      throw new PolarisError("OpenAI agent not ready");
    }

    const startTime = performance.now();

    try {
      // Prepare the evaluation prompt using the new role/task-aware method
      const prompt = this.buildPrompt(gameState, actions);

      // Make API call to OpenAI
      const messages: ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: this.systemPrompt,
        },
        {
          role: "user",
          content: prompt,
        },
      ];

      const requestParams: any = {
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        messages,
      };

      if (this.config.temperature !== undefined) {
        requestParams.temperature = this.config.temperature;
      }

      const openAIResponse =
        await this.client.chat.completions.create(requestParams);

      this.logger.debug("OpenAI response received", {
        response: openAIResponse,
      });

      const evaluation = this.parseEvaluationResponse(openAIResponse);
      const processingTime = performance.now() - startTime;
      evaluation.evaluationTime = processingTime;

      // Create unified agent output
      const output = this.createAgentOutput(
        evaluation,
        processingTime,
        this.config.model,
        openAIResponse.usage?.total_tokens || 0
      );

      // Update statistics
      this.updateStatisticsFromOutput(output);

      this.logger.debug("OpenAI evaluation completed", {
        gameStateId: gameState.id,
        processingTime,
        confidence: evaluation.confidence,
        tokensUsed: openAIResponse.usage?.total_tokens || 0,
      });

      return output;
    } catch (error) {
      this.statistics.errorCount++;
      this.logger.errorSafe("OpenAI evaluation failed", error);

      let errorMessage = String(error);
      let errorType = "UNKNOWN_ERROR";

      if (error instanceof OpenAI.APIError) {
        errorMessage = `OpenAI API Error: ${error.message}`;
        errorType = "OPENAI_API_ERROR";
      } else if (error instanceof OpenAI.APIConnectionError) {
        errorMessage = `OpenAI Connection Error: ${error.message}`;
        errorType = "OPENAI_CONNECTION_ERROR";
      } else if (error instanceof OpenAI.RateLimitError) {
        errorMessage = `OpenAI Rate Limit Error: ${error.message}`;
        errorType = "OPENAI_RATE_LIMIT_ERROR";
      }

      // Create error evaluation
      const fallbackEvaluation: EvaluationResult = {
        agentId: this.id,
        score: 0.5, // Neutral score
        confidence: 0.1, // Low confidence
        reasoning: `Evaluation failed: ${errorMessage}`,
        metadata: {
          error: true,
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
          type: errorType,
        }
      );
    }
  }

  async selectAction(_state: GameState, actions: Action[]): Promise<Action> {
    // For now, return the first action as this is primarily an evaluation agent
    // In a full implementation, this would use GPT to select the best action
    if (actions.length === 0) {
      throw new PolarisError("No actions available for selection");
    }

    this.logger.debug(
      "Action selection not implemented, returning first action"
    );
    return actions[0];
  }

  clone(): OpenAIAgent {
    return new OpenAIAgent({
      ...this.config,
      role: this.role,
      task: this.task,
    } as OpenAIAgentConfig);
  }

  override async cleanup(): Promise<void> {
    this.ready = false;
    this.logger.info("OpenAI agent cleaned up");
    await super.cleanup();
  }

  // Private helper methods

  private async testConnection(): Promise<void> {
    try {
      // Test connection with models endpoint
      await this.client.models.list();
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        throw new PolarisError(
          `OpenAI API connection test failed: ${error.message}`,
          "OPENAI_API_ERROR",
          { status: error.status, type: error.type }
        );
      }
      throw new PolarisError(
        `OpenAI API connection test failed: ${error}`,
        "OPENAI_CONNECTION_ERROR"
      );
    }
  }

  private parseEvaluationResponse(
    response: OpenAI.Chat.Completions.ChatCompletion
  ): EvaluationResult {
    try {
      let content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response content received");
      }

      // Sanitize the response to remove markdown code blocks
      const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
      const match = content.match(jsonRegex);
      if (match && match[1]) {
        content = match[1];
      } else {
        // Fallback for cases where the ```json marker is missing but it's still wrapped
        const codeBlockRegex = /```\s*([\s\S]*?)\s*```/;
        const codeMatch = content.match(codeBlockRegex);
        if (codeMatch && codeMatch[1]) {
          content = codeMatch[1];
        }
      }

      const parsed = JSON.parse(content);

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
          tokensUsed: response.usage?.total_tokens || 0,
          model: this.config.model,
        },
      };
    } catch (error) {
      this.logger.warn(
        "Failed to parse OpenAI response, using fallback",
        error
      );

      return {
        agentId: this.id,
        score: 0.5,
        confidence: 0.3,
        reasoning: `Failed to parse response: ${error}`,
        metadata: {
          parseError: true,
          rawResponse: response.choices[0]?.message?.content,
        },
      };
    }
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
    return `You are an expert AI assistant specializing in analysis and evaluation. You have been assigned a specific role and task context that should guide your analysis.

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
