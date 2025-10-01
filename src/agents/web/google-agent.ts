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
import axios, { AxiosInstance } from "axios";

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
 * Google Gemini API response structure
 */
interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
      role: string;
    };
    finishReason: string;
    index: number;
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

/**
 * Google Gemini Agent for game state evaluation
 */
export class GoogleAgent extends BaseAgent {
  private config: GoogleConfig;
  private httpClient: AxiosInstance;
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

    // Initialize HTTP client
    this.httpClient = axios.create({
      baseURL:
        EnvironmentConfig.GOOGLE.baseURL ||
        "https://generativelanguage.googleapis.com",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": this.config.apiKey,
      },
      timeout: EnvironmentConfig.GOOGLE.timeout || 30000,
    });

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
      const response = await this.httpClient.post(
        `/v1beta/models/${this.config.model}:generateContent`,
        {
          contents: [
            {
              parts: [
                {
                  text: `${this.systemPrompt}\n\n${prompt}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: this.config.temperature,
            maxOutputTokens: this.config.maxTokens,
          },
        }
      );

      const geminiResponse: GeminiResponse = response.data;
      const evaluation = this.parseEvaluationResponse(geminiResponse);

      // Update statistics
      const evaluationTime = performance.now() - startTime;
      evaluation.evaluationTime = evaluationTime;
      this.updateStatistics(evaluation);

      this.logger.debug("Google evaluation completed", {
        gameStateId: gameState.id,
        evaluationTime,
        confidence: evaluation.confidence,
        tokensUsed: geminiResponse.usageMetadata.totalTokenCount,
      });

      return evaluation;
    } catch (error) {
      this.statistics.errorCount++;
      this.logger.errorSafe("Google evaluation failed", error);

      // Return a default evaluation on error
      return {
        agentId: this.id,
        score: 0.5, // Neutral score
        confidence: 0.1, // Low confidence
        reasoning: `Evaluation failed: ${error}`,
        metadata: {
          error: true,
          errorMessage: String(error),
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
      const response = await this.httpClient.post(
        `/v1beta/models/${this.config.model}:generateContent`,
        {
          contents: [
            {
              parts: [
                {
                  text: 'Hello, respond with just "OK"',
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 10,
          },
        }
      );

      if (response.status !== 200) {
        throw new Error(`API test failed with status: ${response.status}`);
      }

      // Check if we have a valid response
      const candidates = response.data?.candidates;
      if (!candidates || candidates.length === 0) {
        throw new Error("No candidates in response");
      }
    } catch (error) {
      throw new Error(`Google API connection test failed: ${error}`);
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

  private parseEvaluationResponse(response: GeminiResponse): EvaluationResult {
    try {
      const candidate = response.candidates[0];
      if (!candidate || !candidate.content.parts[0]?.text) {
        throw new Error("No response content received");
      }

      let content = candidate.content.parts[0].text;

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
          tokensUsed: response.usageMetadata.totalTokenCount,
          model: this.config.model,
          finishReason: candidate.finishReason,
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
          rawResponse: response.candidates[0]?.content.parts[0]?.text,
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
