/**
 * Google Gemini Agent Implementation
 */

import { BaseAgent } from "../base/agent";
import { GameState } from "../../domains/base/game-state";
import { Action } from "../../domains/base/action";
import { EvaluationResult } from "../../types/evaluation";
import { WebAPIConfig } from "../base/parameters";
import { Logger } from "../../utils/logger";
import { EnvironmentConfig } from "../../utils/config";
import { PolarisError } from "../../errors/base";
import { GoogleGenAI } from "@google/genai";

export const DEFAULT_GOOGLE_NAME = "Gemini 2.5 pro";
export const DEFAULT_GOOGLE_MODEL = "gemini-2.5-pro";

/**
 * Google-specific configuration
 */
export interface GoogleConfig extends WebAPIConfig {
  model: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

/**
 * Google-specific configuration that extends with role and task awareness
 */
export interface GoogleAgentConfig extends GoogleConfig {
  role: import("../../types/task").AgentRole;
  task: import("../../types/task").PolarisEngineTask;
}

/**
 * Google Gemini Agent for game state evaluation
 */
export class GoogleAgent extends BaseAgent {
  private config: GoogleConfig;
  private client: GoogleGenAI;
  private systemPrompt: string;
  private logger: Logger;

  constructor(config: GoogleAgentConfig) {
    // Generate ID if not provided
    const agentId = config.id || BaseAgent.generateAgentId("Google");

    const baseConfig: GoogleConfig = {
      ...config,
      id: agentId,
      name: config.name || DEFAULT_GOOGLE_NAME,
      provider: "google",
      apiKey: config.apiKey || EnvironmentConfig.GOOGLE.apiKey,
      model: config.model || DEFAULT_GOOGLE_MODEL,
      maxTokens: config.maxTokens || 1000,
      temperature: config.temperature || 0.7,
    };

    super({
      id: agentId,
      name: config.name || DEFAULT_GOOGLE_NAME,
      type: "google",
      role: config.role,
      task: config.task,
      parameters: {
        ...baseConfig,
        provider: "google",
      },
    });

    this.config = baseConfig;

    // Initialize Google GenAI client
    this.client = new GoogleGenAI({ apiKey: this.config.apiKey });
    this.systemPrompt =
      this.config.systemPrompt || this.getDefaultSystemPrompt();
    this.logger = new Logger(
      `GoogleAgent-${this.id}`,
      EnvironmentConfig.POLARIS.logLevel
    );

    this.logger.info("Google agent created", {
      model: this.config.model,
      temperature: this.config.temperature,
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
        this.logger.info("Google agent initialized successfully");
      } catch (testError) {
        // Log warning but continue initialization
        this.logger.warn(
          "Google API connection test failed (agent will retry on first use)",
          testError
        );
      }

      this.ready = true;
      await super.initialize();
    } catch (error) {
      this.logger.errorSafe("Failed to initialize Google agent", error);
      throw new PolarisError(
        `Google agent initialization failed: ${error}`,
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
      throw new PolarisError("Google agent not ready");
    }

    const startTime = performance.now();

    try {
      // Prepare the evaluation prompt using the new role/task-aware method
      const userPrompt = this.buildPrompt(gameState, actions);

      // Make API call to Google Gemini
      const geminiResponse = await this.client.models.generateContent({
        model: this.config.model,
        contents: [
          {
            role: "model",
            parts: [{ text: this.systemPrompt }],
          },
          {
            role: "user",
            parts: [{ text: userPrompt }],
          },
        ],
        config: {
          ...(this.config.temperature !== undefined && {
            temperature: this.config.temperature,
          }),
          ...(this.config.maxTokens !== undefined && {
            maxOutputTokens: this.config.maxTokens,
          }),
        },
      });

      this.logger.debug("Google API response received", geminiResponse);

      const evaluation = this.parseEvaluationResponse(geminiResponse);
      const processingTime = performance.now() - startTime;
      evaluation.evaluationTime = processingTime;

      // Create unified agent output
      const output = this.createAgentOutput(
        evaluation,
        processingTime,
        this.config.model,
        (geminiResponse as any).usage?.totalTokens || 0
      );

      // Update statistics
      this.updateStatisticsFromOutput(output);

      this.logger.debug("Google evaluation completed", {
        gameStateId: gameState.id,
        processingTime,
        confidence: evaluation.confidence,
        tokensUsed: (geminiResponse as any).usage?.totalTokens || 0,
      });

      return output;
    } catch (error) {
      this.statistics.errorCount++;
      this.logger.errorSafe("Google evaluation failed", error);

      let errorMessage = String(error);
      let errorMetadata: any = { error: true };

      if (error instanceof Error) {
        errorMessage = `Google API Error: ${error.message}`;
        // Check for specific Google API error patterns
        if (error.message.includes("API key")) {
          errorMetadata.authError = true;
        } else if (
          error.message.includes("quota") ||
          error.message.includes("rate")
        ) {
          errorMetadata.rateLimited = true;
        } else if (
          error.message.includes("network") ||
          error.message.includes("connection")
        ) {
          errorMetadata.connectionError = true;
        }
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
            ? "GOOGLE_RATE_LIMIT_ERROR"
            : "GOOGLE_API_ERROR",
        }
      );
    }
  }

  async selectAction(_state: GameState, actions: Action[]): Promise<Action> {
    // For now, return the first action as this is primarily an evaluation agent
    // In a full implementation, this would use Gemini to select the best action
    if (actions.length === 0) {
      throw new PolarisError("No actions available for selection");
    }

    this.logger.debug(
      "Action selection not implemented, returning first action"
    );
    return actions[0];
  }

  clone(): GoogleAgent {
    return new GoogleAgent({
      ...this.config,
      role: this.role,
      task: this.task,
    } as GoogleAgentConfig);
  }

  override async cleanup(): Promise<void> {
    this.ready = false;
    this.logger.info("Google agent cleaned up");
    await super.cleanup();
  }

  // Private helper methods

  private async testConnection(): Promise<void> {
    try {
      // Test with a minimal generation request
      await this.client.models.generateContent({
        model: this.config.model,
        contents: "test",
        config: {
          maxOutputTokens: 1,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new PolarisError(
          `Google API connection test failed: ${error.message}`,
          "GOOGLE_API_ERROR"
        );
      }
      throw new PolarisError(
        `Google API connection test failed: ${String(error)}`,
        "GOOGLE_CONNECTION_ERROR"
      );
    }
  }

  private parseEvaluationResponse(response: any): EvaluationResult {
    const rawContent = response.text || "";

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
          tokensUsed: (response as any).usage?.totalTokens || 0,
          model: this.config.model,
        },
      };
    } catch (error) {
      this.logger.warn(
        "Failed to parse Google response, using fallback",
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

    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fencedMatch && fencedMatch[1]) {
      return fencedMatch[1].trim();
    }

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
    return `You are Gemini, an expert AI assistant specializing in analysis and evaluation. You have been assigned a specific role and task context that should guide your analysis.

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
