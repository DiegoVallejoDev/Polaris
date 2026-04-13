/**
 * OpenAI agent that uses the Strategy pattern for prompt/output handling.
 *
 * The original OpenAIAgent remains untouched for backwards compatibility.
 * This class provides the strategy-aware variant for the Polaris Creativa pipeline.
 *
 * Contains ZERO conditionals about layers. All behavioral variation
 * comes from the PromptStrategy and OutputParserStrategy injected at construction.
 *
 * Supports:
 * - Structured Outputs (json_schema) for deterministic parsing (Layers 2 & 4)
 * - AbortController for latency bounding (Layer 1 parallel timeout)
 */

import { StrategyAgent } from "../base/strategy-agent";
import { GameState } from "../../domains/base/game-state";
import { Action } from "../../domains/base/action";
import { Agent } from "../base/agent";
import { AgentOutput } from "../../types/agent-output";
import { RawLLMResponse } from "../../strategies/output-parser-strategy";
import { PromptStrategy } from "../../strategies/prompt-strategy";
import { OutputParserStrategy } from "../../strategies/output-parser-strategy";
import { AgentRole, PolarisEngineTask } from "../../types/task";
import { AgentParameters } from "../base/parameters";
import { Logger } from "../../utils/logger";
import { EnvironmentConfig } from "../../utils/config";
import { PolarisError } from "../../errors/base";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

/**
 * Optional: JSON Schema definition for Structured Outputs.
 * If provided, the agent will use response_format: { type: "json_schema", ... }
 * instead of relying on regex-based post-hoc parsing.
 */
export interface StructuredOutputSchema {
  /** Schema name (required by OpenAI's Structured Outputs) */
  readonly name: string;

  /** Whether all properties are required (enables strict mode) */
  readonly strict: boolean;

  /** The JSON Schema definition */
  readonly schema: Record<string, unknown>;
}

export interface OpenAIStrategyAgentConfig {
  role: AgentRole;
  task: PolarisEngineTask;
  promptStrategy: PromptStrategy;
  outputParserStrategy: OutputParserStrategy;

  /** OpenAI-specific config */
  model?: string;
  apiKey?: string;
  maxTokens?: number;
  temperature?: number;
  name?: string;

  /** Additional agent parameters (bias, weight, etc.) */
  parameters?: Partial<AgentParameters>;

  /**
   * If provided, enforces Structured Outputs at the API level.
   * The LLM is guaranteed to return JSON conforming to this schema.
   * Eliminates regex-based parsing fallbacks entirely.
   */
  structuredOutputSchema?: StructuredOutputSchema;
}

export class OpenAIStrategyAgent extends StrategyAgent {
  private client: OpenAI;
  private model: string;
  private defaultMaxTokens: number;
  private defaultTemperature: number;
  private structuredSchema: StructuredOutputSchema | undefined;
  private logger: Logger;

  /**
   * AbortController signal — injected by the pipeline for timeout enforcement.
   * The agent does NOT manage its own timeout. The pipeline owns the deadline.
   */
  private _abortSignal: AbortSignal | undefined;

  constructor(config: OpenAIStrategyAgentConfig) {
    const model = config.model ?? "gpt-4o";
    const apiKey = config.apiKey ?? EnvironmentConfig.OPENAI.apiKey;

    super({
      name: config.name ?? `${config.role.name} (${model})`,
      type: "openai",
      role: config.role,
      task: config.task,
      promptStrategy: config.promptStrategy,
      outputParserStrategy: config.outputParserStrategy,
      parameters: {
        temperature: config.temperature ?? 0.7,
        ...config.parameters,
        // Store provider-specific config in the index signature
        provider: "openai",
        apiKey,
        model,
        maxTokens: config.maxTokens ?? 1000,
      },
    });

    this.model = model;
    this.defaultMaxTokens = config.maxTokens ?? 1000;
    this.defaultTemperature = config.temperature ?? 0.7;
    this.structuredSchema = config.structuredOutputSchema;

    this.client = new OpenAI({
      apiKey,
      timeout: EnvironmentConfig.OPENAI.timeout ?? 30000,
      maxRetries: EnvironmentConfig.OPENAI.maxRetries ?? 3,
    });

    this.logger = new Logger(
      `OpenAIStrategyAgent-${this.id}`,
      EnvironmentConfig.POLARIS.logLevel
    );
  }

  /**
   * Inject an AbortSignal for timeout enforcement.
   * Called by the pipeline — NOT by the agent itself.
   */
  setAbortSignal(signal: AbortSignal): void {
    this._abortSignal = signal;
  }

  override async initialize(): Promise<void> {
    try {
      await this.client.models.list();
      this.ready = true;
      await super.initialize();
      this.logger.info("OpenAI strategy agent initialized");
    } catch (error) {
      throw new PolarisError(
        `OpenAI strategy agent initialization failed: ${error}`,
        "AGENT_INIT_FAILED",
        { agentId: this.id }
      );
    }
  }

  /**
   * Core evaluation method.
   * Delegates ALL prompt construction to this.promptStrategy
   * and ALL output parsing to this.outputParserStrategy.
   * Contains ZERO layer-awareness logic.
   */
  async evaluate(state: GameState, actions?: Action[]): Promise<AgentOutput> {
    const startTime = performance.now();

    try {
      // 1. Build prompt context (assembled by StrategyAgent base)
      const promptContext = this.buildPromptContext(state, actions);

      // 2. Delegate prompt construction entirely to strategies
      const systemPrompt = this.getSystemPrompt(promptContext);
      const userPrompt = this.getUserPrompt(promptContext);

      // 3. Get strategy-controlled parameters
      const temperature =
        this.getEffectiveTemperature(promptContext) ?? this.defaultTemperature;
      const maxTokens =
        this.getEffectiveMaxTokens(promptContext) ?? this.defaultMaxTokens;

      // 4. Build the API request
      const messages: ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ];

      const requestParams: Record<string, unknown> = {
        model: this.model,
        messages,
        temperature,
        max_tokens: maxTokens,
      };

      // 4a. Structured Outputs: enforce schema at API level if configured
      if (this.structuredSchema) {
        requestParams.response_format = {
          type: "json_schema",
          json_schema: {
            name: this.structuredSchema.name,
            strict: this.structuredSchema.strict,
            schema: this.structuredSchema.schema,
          },
        };
      }

      // 4b. AbortSignal: wire pipeline timeout into OpenAI client
      const requestOptions: Record<string, unknown> = {};
      if (this._abortSignal) {
        requestOptions.signal = this._abortSignal;
      }

      // 5. Make the API call
      const openAIResponse = await this.client.chat.completions.create(
        requestParams as any,
        requestOptions as any
      );

      const content = openAIResponse.choices[0]?.message?.content ?? "";
      const processingTime = performance.now() - startTime;

      // 6. Delegate parsing entirely to the output parser strategy
      const rawResponse: RawLLMResponse = {
        content,
        tokensUsed: openAIResponse.usage?.total_tokens ?? 0,
        model: this.model,
        processingTime,
        agentId: this.id,
      };

      const output = this.parseResponse(rawResponse);

      // 7. Update statistics (inherited from BaseAgent)
      this.updateStatisticsFromOutput(output);

      return output;
    } catch (error) {
      this.statistics.errorCount++;

      // Detect abort (timeout) vs. API error
      const isAborted =
        error instanceof Error && error.name === "AbortError";

      const errorMessage = isAborted
        ? `Agent ${this.id} timed out (aborted by pipeline)`
        : String(error);

      const errorType = isAborted
        ? "AGENT_TIMEOUT"
        : error instanceof OpenAI.APIError
          ? "OPENAI_API_ERROR"
          : "UNKNOWN_ERROR";

      this.logger.warn(`OpenAI strategy agent error: ${errorType}`, {
        agentId: this.id,
        errorMessage,
      });

      // Create error output using BaseAgent's factory
      return this.createAgentOutput(
        {
          agentId: this.id,
          score: 0.5,
          confidence: 0.1,
          reasoning: `Evaluation failed: ${errorMessage}`,
          metadata: { error: true, errorType },
        },
        performance.now() - startTime,
        this.model,
        0,
        {
          hasError: true,
          message: errorMessage,
          type: errorType,
        }
      );
    } finally {
      // Clear signal after use to prevent stale references
      this._abortSignal = undefined;
    }
  }

  async selectAction(_state: GameState, actions: Action[]): Promise<Action> {
    if (actions.length === 0) {
      throw new PolarisError("No actions available for selection");
    }
    return actions[0];
  }

  clone(): Agent {
    const cloneConfig: OpenAIStrategyAgentConfig = {
      role: this.role,
      task: this.task,
      promptStrategy: this.promptStrategy,
      outputParserStrategy: this.outputParserStrategy,
      model: this.model,
      maxTokens: this.defaultMaxTokens,
      temperature: this.defaultTemperature,
    };
    if (this.structuredSchema !== undefined) {
      cloneConfig.structuredOutputSchema = this.structuredSchema;
    }
    return new OpenAIStrategyAgent(cloneConfig);
  }
}
