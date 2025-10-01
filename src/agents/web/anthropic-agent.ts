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

/**
 * Anthropic-specific configuration
 */
export interface AnthropicConfig extends WebAPIConfig {
  model: string;
  maxTokens: number;
  systemPrompt?: string;
}

/**
 * Anthropic Claude Agent for game state evaluation
 */
export class AnthropicAgent extends BaseAgent {
  private config: AnthropicConfig;
  private client: Anthropic;
  private systemPrompt: string;
  private logger: Logger;

  constructor(config: AnthropicConfig) {
    // Generate ID if not provided
    const agentId = config.id || BaseAgent.generateAgentId("Anthropic");

    super(agentId, config.name || "Claude-3", "WebAPI", {
      ...config,
      provider: "anthropic",
    });

    this.config = {
      ...config,
      id: agentId,
      name: config.name || "Claude-3",
      provider: "anthropic",

      model: config.model || "claude-3-haiku-20240307",
      maxTokens: config.maxTokens || 1000,
      systemPrompt: config.systemPrompt || this.getDefaultSystemPrompt(),
    };

    // Initialize Anthropic client
    this.client = new Anthropic({
      apiKey: this.config.apiKey,
      timeout: EnvironmentConfig.ANTHROPIC.timeout || 30000,
      maxRetries: EnvironmentConfig.ANTHROPIC.maxRetries || 3,
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
    });
  }

  override async initialize(): Promise<void> {
    try {
      // Test API connection
      await this.testConnection();
      this.ready = true;
      this.logger.info("Anthropic agent initialized successfully");
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

  async evaluate(gameState: GameState): Promise<EvaluationResult> {
    if (!this.isReady()) {
      throw new PolarisError("Anthropic agent not ready");
    }

    const startTime = performance.now();

    try {
      this.statistics.totalEvaluations++;

      // Prepare the evaluation prompt
      const prompt = this.buildEvaluationPrompt(gameState);

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
      const evaluation = this.parseEvaluationResponse(anthropicResponse);

      // Update statistics
      const evaluationTime = performance.now() - startTime;
      evaluation.evaluationTime = evaluationTime;
      this.updateStatistics(evaluation);

      this.logger.debug("Anthropic evaluation completed", {
        gameStateId: gameState.id,
        evaluationTime,
        confidence: evaluation.confidence,
        tokensUsed:
          anthropicResponse.usage.input_tokens +
          anthropicResponse.usage.output_tokens,
      });

      return evaluation;
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
    return new AnthropicAgent({ ...this.config });
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
      await this.client.messages.create({
        model: this.config.model,
        max_tokens: 10,
        messages: [
          {
            role: "user",
            content: "Hello",
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
        `Anthropic API connection test failed: ${error}`,
        "ANTHROPIC_CONNECTION_ERROR"
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

  private parseEvaluationResponse(
    response: Anthropic.Messages.Message
  ): EvaluationResult {
    try {
      const textBlock = response.content.find(
        (block): block is Anthropic.TextBlock => block.type === "text"
      );
      const content = textBlock?.text;
      if (!content) {
        throw new Error("No response content received");
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
          rawResponse: response.content.find(
            (block): block is Anthropic.TextBlock => block.type === "text"
          )?.text,
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
    return `You are Claude, an expert chess analysis AI assistant specializing in position evaluation. Your role is to:

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
