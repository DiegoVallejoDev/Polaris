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
import axios, { AxiosInstance } from "axios";

/**
 * OpenAI-specific configuration
 */
export interface OpenAIConfig extends WebAPIConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
}

/**
 * OpenAI API response structure
 */
interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
  usage: {
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
  };
}

/**
 * OpenAI GPT Agent for game state evaluation
 */
export class OpenAIAgent extends BaseAgent {
  private config: OpenAIConfig;
  private httpClient: AxiosInstance;
  private logger: Logger;

  constructor(config: OpenAIConfig) {
    // Generate ID if not provided
    const agentId = config.id || BaseAgent.generateAgentId("OpenAI");

    super(agentId, config.name || "OpenAI-GPT", "WebAPI", {
      ...config,
      provider: "openai",
    });

    this.config = {
      ...config,
      id: agentId,
      name: config.name || "OpenAI-GPT",
      provider: "openai",
      apiKey: config.apiKey || EnvironmentConfig.OPENAI.apiKey,
      model: config.model || "gpt-4o",
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 1000,
      systemPrompt: config.systemPrompt || this.getDefaultSystemPrompt(),
    };

    // Initialize HTTP client
    const headers: any = {
      Authorization: `Bearer ${this.config.apiKey}`,
      "Content-Type": "application/json",
    };

    // Add project ID if available
    const projectId =
      process.env.OPENAI_PROJECT_ID || "proj_ZnXApPLTnfWhXlp0dZhC7aCd";
    if (projectId) {
      headers["OpenAI-Project"] = projectId;
    }

    this.httpClient = axios.create({
      baseURL: EnvironmentConfig.OPENAI.baseURL || "https://api.openai.com/v1",
      headers,
      timeout: EnvironmentConfig.OPENAI.timeout || 45000,
    });

    this.logger = new Logger(
      `OpenAIAgent-${this.id}`,
      EnvironmentConfig.POLARIS.logLevel
    );

    this.logger.info("OpenAI agent created", {
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
      this.logger.info("OpenAI agent initialized successfully");
      await super.initialize();
    } catch (error) {
      this.logger.errorSafe("Failed to initialize OpenAI agent", error);
      throw new PolarisError(
        `OpenAI agent initialization failed: ${error instanceof Error ? error.message : String(error)}`,
        "AGENT_INIT_FAILED",
        { agentId: this.id }
      );
    }
  }

  async evaluate(gameState: GameState): Promise<EvaluationResult> {
    if (!this.isReady()) {
      throw new PolarisError("OpenAI agent not ready");
    }

    const startTime = performance.now();
    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.statistics.totalEvaluations++;

        // Prepare the evaluation input (simplified format)
        const input = this.buildEvaluationPrompt(gameState);

        // Make API call using simplified format similar to curl example
        const openaiResponse = await this.makeSimplifiedAPICall(input);
        const evaluation = this.parseEvaluationResponse(openaiResponse);

        // Update statistics
        const evaluationTime = performance.now() - startTime;
        evaluation.evaluationTime = evaluationTime;
        this.updateStatistics(evaluation);

        this.logger.debug("OpenAI evaluation completed", {
          gameStateId: gameState.id,
          evaluationTime,
          confidence: evaluation.confidence,
          tokensUsed: openaiResponse.usage.total_tokens,
        });

        return evaluation;
      } catch (error: any) {
        lastError = error;
        this.statistics.errorCount++;

        // Check if this is a rate limit error (429)
        if (error.response?.status === 429 && attempt < maxRetries) {
          // Parse retry-after header if available
          const retryAfterHeader = error.response?.headers?.["retry-after"];
          const retryAfterMs = retryAfterHeader
            ? parseInt(retryAfterHeader) * 1000
            : null;

          // Use longer delays for rate limits: 10s, 30s, 60s
          const baseDelays = [10000, 30000, 60000];
          const retryDelay = retryAfterMs || baseDelays[attempt - 1] || 60000;

          this.logger.warn(
            `Rate limit exceeded, retrying in ${Math.round(retryDelay / 1000)}s (attempt ${attempt}/${maxRetries})`
          );
          if (retryAfterHeader) {
            this.logger.info(
              `Using retry-after header value: ${retryAfterHeader} seconds`
            );
          }

          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          continue;
        }

        this.logger.errorSafe(
          `OpenAI evaluation failed (attempt ${attempt}/${maxRetries})`,
          error
        );

        // If this was the last attempt or not a retryable error, break
        if (attempt === maxRetries || error.response?.status !== 429) {
          break;
        }
      }
    }

    // Return a default evaluation on error
    return {
      agentId: this.id,
      score: 0.5, // Neutral score
      confidence: 0.1, // Low confidence
      reasoning: `Evaluation failed: ${lastError instanceof Error ? lastError.message : "API rate limit exceeded"}`,
      metadata: {
        error: true,
        errorMessage: String(lastError),
        evaluationTime: performance.now() - startTime,
        maxRetries,
      },
    };
  }

  async selectAction(_state: GameState, actions: Action[]): Promise<Action> {
    // For now, return the first action as this is primarily an evaluation agent
    // In a full implementation, this would use the LLM to select the best action
    if (actions.length === 0) {
      throw new PolarisError("No actions available for selection");
    }

    this.logger.debug(
      "Action selection not implemented, returning first action"
    );
    return actions[0];
  }

  clone(): OpenAIAgent {
    return new OpenAIAgent({ ...this.config });
  }

  override async cleanup(): Promise<void> {
    this.ready = false;
    this.logger.info("OpenAI agent cleaned up");
    await super.cleanup();
  }

  // Private helper methods

  private async testConnection(): Promise<void> {
    try {
      const response = await this.httpClient.get("/models");

      if (response.status !== 200) {
        throw new Error(`API test failed with status: ${response.status}`);
      }

      // Check if our model is available
      const models = response.data.data;
      const modelExists = models.some(
        (model: any) => model.id === this.config.model
      );

      if (!modelExists) {
        this.logger.warn(
          `Model ${this.config.model} not found, but API is accessible`
        );
      }
    } catch (error) {
      throw new Error(`OpenAI API connection test failed: ${error}`);
    }
  }

  private buildEvaluationPrompt(gameState: GameState): string {
    return `Analyze this chess position and provide evaluation as JSON: State ID: ${gameState.id}, Player: ${gameState.currentPlayer}, Turn: ${gameState.getTurnNumber()}, Data: ${JSON.stringify(gameState.serialize())}. Return {"score": 0-1, "confidence": 0-1, "reasoning": "explanation"}.`;
  }

  /**
   * Simplified API call method matching curl example format
   */
  private async makeSimplifiedAPICall(input: string): Promise<OpenAIResponse> {
    try {
      // Use the simplified format similar to the curl example
      const response = await this.httpClient.post("/chat/completions", {
        model: this.config.model,
        messages: [
          {
            role: "user",
            content: input,
          },
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        response_format: { type: "json_object" },
      });

      return response.data;
    } catch (error) {
      this.logger.errorSafe("Simplified API call failed", error);
      throw error;
    }
  }

  private parseEvaluationResponse(response: OpenAIResponse): EvaluationResult {
    try {
      const content = response.choices[0]?.message?.content;
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
          tokensUsed: response.usage.total_tokens,
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
    return `You are an expert chess analysis AI assistant specializing in position evaluation. Your role is to:

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
