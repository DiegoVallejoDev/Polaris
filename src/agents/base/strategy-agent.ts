/**
 * Strategy-aware base agent. Replaces layer-mode conditionals with
 * injected PromptStrategy and OutputParserStrategy.
 *
 * This class is BLIND to which layer it operates in.
 * It delegates prompt construction and output parsing entirely to strategies.
 *
 * The original BaseAgent remains untouched for backwards compatibility.
 * StrategyAgent extends it and overrides the relevant methods.
 */

import { BaseAgent } from "./agent";
import { GameState } from "../../domains/base/game-state";
import { Action } from "../../domains/base/action";
import { AgentOutput } from "../../types/agent-output";
import { AgentParameters } from "./parameters";
import { AgentRole, PolarisEngineTask } from "../../types/task";
import {
  PromptStrategy,
  PromptContext,
  CumulativeTokenUsage,
} from "../../strategies/prompt-strategy";
import {
  OutputParserStrategy,
  RawLLMResponse,
} from "../../strategies/output-parser-strategy";
import { LayerMessage } from "../../types/layer";

/**
 * Configuration for a strategy-aware agent.
 */
export interface StrategyAgentConfig {
  id?: string;
  name: string;
  type: string;
  role: AgentRole;
  task: PolarisEngineTask;
  parameters: AgentParameters;

  /** Injected prompt construction strategy */
  promptStrategy: PromptStrategy;

  /** Injected output parsing strategy */
  outputParserStrategy: OutputParserStrategy;
}

/**
 * Abstract base for strategy-aware agents.
 * Contains NO conditionals about layers, prompt formats, or output parsing.
 * All behavioral variation is encapsulated in the injected strategies.
 */
export abstract class StrategyAgent extends BaseAgent {
  protected readonly promptStrategy: PromptStrategy;
  protected readonly outputParserStrategy: OutputParserStrategy;

  /**
   * Mutable: set by the pipeline before calling evaluate().
   * Contains the message from the previous layer (if any).
   */
  private _currentLayerMessage: LayerMessage | undefined;

  /**
   * Mutable: set by the pipeline before calling evaluate().
   * Current pipeline iteration for decay computation.
   */
  private _currentPipelineIteration: number = 0;

  /**
   * Mutable: set by the pipeline before calling evaluate().
   * Decay-adjusted temperature override.
   */
  private _effectiveTemperatureDelta: number = 0;

  /**
   * Mutable: set by the pipeline before calling evaluate().
   * Cumulative token usage for cost-aware routing.
   */
  private _cumulativeTokenUsage: CumulativeTokenUsage | undefined;

  protected constructor(config: StrategyAgentConfig) {
    super({
      id: config.id ?? BaseAgent.generateAgentId(config.type),
      name: config.name,
      type: config.type,
      role: config.role,
      task: config.task,
      parameters: config.parameters,
    });

    this.promptStrategy = config.promptStrategy;
    this.outputParserStrategy = config.outputParserStrategy;
  }

  // ─── Pipeline injection methods (called by LayerPipeline, NOT by the agent) ───

  /**
   * Inject the incoming layer message before evaluation.
   * Called by the pipeline orchestrator — the agent never calls this on itself.
   */
  setLayerMessage(message: LayerMessage | undefined): void {
    this._currentLayerMessage = message;
  }

  /**
   * Inject pipeline iteration and temperature delta from the Decay system.
   */
  setDecayParameters(iteration: number, temperatureDelta: number): void {
    this._currentPipelineIteration = iteration;
    this._effectiveTemperatureDelta = temperatureDelta;
  }

  /**
   * Inject cumulative token usage for cost-aware routing (Layer 4).
   */
  setTokenUsage(usage: CumulativeTokenUsage): void {
    this._cumulativeTokenUsage = usage;
  }

  // ─── Core delegation to strategies ───

  /**
   * Build the full prompt context for strategy delegation.
   * This is the ONLY place where context is assembled — NO conditional logic.
   */
  protected buildPromptContext(
    state: GameState,
    actions?: Action[]
  ): PromptContext {
    const ctx: Record<string, unknown> = {
      state,
      role: this.role,
      task: this.task,
      pipelineIteration: this._currentPipelineIteration,
      effectiveTemperature: this._effectiveTemperatureDelta,
    };
    if (actions !== undefined) {
      ctx.actions = actions;
    }
    if (this._currentLayerMessage !== undefined) {
      ctx.incomingMessage = this._currentLayerMessage;
    }
    if (this._cumulativeTokenUsage !== undefined) {
      ctx.cumulativeTokenUsage = this._cumulativeTokenUsage;
    }
    return ctx as unknown as PromptContext;
  }

  /**
   * Delegate system prompt construction to the injected strategy.
   */
  protected getSystemPrompt(context: PromptContext): string {
    return this.promptStrategy.buildSystemPrompt(context);
  }

  /**
   * Delegate user prompt construction to the injected strategy.
   */
  protected getUserPrompt(context: PromptContext): string {
    return this.promptStrategy.buildUserPrompt(context);
  }

  /**
   * Get the effective temperature from the strategy.
   */
  protected getEffectiveTemperature(context: PromptContext): number | undefined {
    return this.promptStrategy.getTemperature(context);
  }

  /**
   * Get the effective max tokens from the strategy.
   */
  protected getEffectiveMaxTokens(context: PromptContext): number | undefined {
    return this.promptStrategy.getMaxTokens(context);
  }

  /**
   * Delegate output parsing to the injected strategy.
   * Converts the raw LLM response into an AgentOutput using the
   * parent BaseAgent's createAgentOutput factory method.
   */
  protected parseResponse(rawResponse: RawLLMResponse): AgentOutput {
    const parsed = this.outputParserStrategy.parse(rawResponse);

    // Build the AgentOutput using the parent's factory method
    const output = this.createAgentOutput(
      parsed.evaluation,
      rawResponse.processingTime,
      rawResponse.model,
      rawResponse.tokensUsed
    );

    // Attach layer-specific data via metadata (not via conditionals)
    output.metadata = {
      ...output.metadata,
      rawContent: parsed.rawContent,
      validatedFragments: parsed.validatedFragments,
      synthesizedDraft: parsed.synthesizedDraft,
      orchestratorVerdict: parsed.orchestratorVerdict,
    };

    return output;
  }
}
