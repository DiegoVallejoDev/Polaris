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
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GenerativeModel } from "@google/generative-ai";

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
 * Google Gemini Agent for game state evaluation
 */
export class GoogleAgent extends BaseAgent {
  private config: GoogleConfig;
  private client: GoogleGenerativeAI;
  private model: GenerativeModel;
  private systemPrompt: string;
  private logger: Logger;

  constructor(config: GoogleConfig) {
    // Generate ID if not provided
    const agentId = config.id || BaseAgent.generateAgentId("Google");

    super(agentId, config.name || "Gemini-Pro", "WebAPI", {
      ...config,
      provider: "google",
    });

    this.config = {
      ...config,
      id: agentId,
      name: config.name || "Gemini-Pro",
      provider: "google",
      apiKey: config.apiKey || EnvironmentConfig.GOOGLE.apiKey,
      model: config.model || "gemini-2.0-flash",
      maxTokens: config.maxTokens || 1000,
      temperature: config.temperature || 0.7,
      systemPrompt: config.systemPrompt || this.getDefaultSystemPrompt(),
    };

    this.systemPrompt =
      this.config.systemPrompt || this.getDefaultSystemPrompt();

    // Initialize Google Generative AI client
    this.client = new GoogleGenerativeAI(this.config.apiKey);
    this.model = this.client.getGenerativeModel({
      model: this.config.model,
      generationConfig: {
        ...(this.config.temperature !== undefined && {
          temperature: this.config.temperature,
        }),
        ...(this.config.maxTokens !== undefined && {
          maxOutputTokens: this.config.maxTokens,
        }),
      },
      systemInstruction: this.systemPrompt,
    });
    this.logger = new Logger(
      `GoogleAgent-${this.id}`,
      EnvironmentConfig.POLARIS.logLevel
    );

    this.logger.info("Google agent created", {
      model: this.config.model,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
    });
  }

  override async initialize(): Promise<void> {
    try {
      // Test API connection
      await this.testConnection();
      this.ready = true;
      this.logger.info("Google agent initialized successfully");
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

  async evaluate(gameState: GameState): Promise<EvaluationResult> {
    if (!this.isReady()) {
      throw new PolarisError("Google agent not ready");
    }

    const startTime = performance.now();

    try {
      this.statistics.totalEvaluations++;

      // Prepare the evaluation prompt
      const prompt = this.buildEvaluationPrompt(gameState);

      // Make API call to Google Gemini
      const result = await this.model.generateContent(prompt);
      const geminiResponse = result.response;
      const evaluation = this.parseEvaluationResponse(geminiResponse);

      // Update statistics
      const evaluationTime = performance.now() - startTime;
      evaluation.evaluationTime = evaluationTime;
      this.updateStatistics(evaluation);

      this.logger.debug("Google evaluation completed", {
        gameStateId: gameState.id,
        evaluationTime,
        confidence: evaluation.confidence,
        tokensUsed: geminiResponse.usageMetadata?.totalTokenCount || 0,
      });

      return evaluation;
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

      // Return a default evaluation on error
      return {
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
    return new GoogleAgent({ ...this.config });
  }

  override async cleanup(): Promise<void> {
    this.ready = false;
    this.logger.info("Google agent cleaned up");
    await super.cleanup();
  }

  // Private helper methods

  private async testConnection(): Promise<void> {
    try {
      // Test with a simple generation request
      const result = await this.model.generateContent(
        'Hello, respond with just "OK"'
      );
      const response = result.response;

      // Check if we have a valid response
      if (!response.text()) {
        throw new Error("No text content in response");
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new PolarisError(
          `Google API connection test failed: ${error.message}`,
          "GOOGLE_API_ERROR"
        );
      }
      throw new PolarisError(
        `Google API connection test failed: ${error}`,
        "GOOGLE_CONNECTION_ERROR"
      );
    }
  }

  private buildEvaluationPrompt(gameState: GameState): string {
    return `
Please evaluate the following game state and provide a comprehensive analysis.

Game State Information:
- State ID: ${gameState.id}
- Current Player: ${gameState.currentPlayer}
- Turn Number: ${gameState.getTurnNumber()}
- Is Terminal: ${gameState.isTerminal}
- Game-specific Data: ${JSON.stringify(gameState.serialize(), null, 2)}

Please analyze this position and provide your evaluation in the following JSON format:
{
  "score": <number between 0 and 1, where 0.5 is neutral>,
  "confidence": <number between 0 and 1 indicating certainty>,
  "reasoning": "<detailed explanation of your evaluation>",
  "keyFactors": ["<factor1>", "<factor2>", ...],
  "recommendedActions": ["<action1>", "<action2>", ...],
  "tacticalThemes": ["<theme1>", "<theme2>", ...],
  "positionType": "<opening/middlegame/endgame/etc>",
  "riskAssessment": "<low/medium/high>"
}

Focus on:
1. Material balance and piece activity
2. King safety and tactical opportunities
3. Pawn structure and long-term considerations
4. Control of key squares and files
5. Overall position assessment from current player's perspective

Provide your response as valid JSON only.
`;
  }

  private parseEvaluationResponse(response: any): EvaluationResult {
    try {
      let content = response.text();
      if (!content) {
        throw new Error("No response content received");
      }

      // Handle markdown-wrapped JSON responses
      if (content.includes("```json")) {
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          content = jsonMatch[1].trim();
        }
      } else if (content.includes("```")) {
        const jsonMatch = content.match(/```\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          content = jsonMatch[1].trim();
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
          tokensUsed: response.usageMetadata?.totalTokenCount || 0,
          model: this.config.model,
          finishReason: response.candidates?.[0]?.finishReason,
          safetyRatings: response.candidates?.[0]?.safetyRatings,
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
          rawResponse: response.text(),
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
    return `You are Gemini, an expert chess analysis AI assistant specializing in position evaluation. Your role is to:

1. Analyze chess positions objectively and thoroughly
2. Consider both tactical and strategic elements
3. Provide numerical evaluations from the current player's perspective
4. Explain your reasoning clearly and concisely
5. Identify key themes and patterns in the position

Always respond in valid JSON format as requested. Your evaluations should be:
- Accurate and well-reasoned
- Consistent in scoring methodology
- Helpful for decision-making processes
- Focused on the most important positional factors

Remember: A score of 0.5 represents equal/neutral positions, above 0.5 favors the current player, below 0.5 favors the opponent.`;
  }
}
