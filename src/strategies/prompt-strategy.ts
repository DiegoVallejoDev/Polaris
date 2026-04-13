/**
 * Strategy interface for prompt construction.
 * Injected into agents at instantiation time.
 * The agent is blind to its layer — it simply delegates to this strategy.
 */

import { GameState } from "../domains/base/game-state";
import { Action } from "../domains/base/action";
import { AgentRole, PolarisEngineTask } from "../types/task";
import { LayerMessage } from "../types/layer";

/**
 * Context provided to the strategy for prompt construction.
 * Contains everything the strategy needs — the agent never decides what to include.
 */
export interface PromptContext {
  /** Current game state (may be undefined for inter-layer agents) */
  readonly state?: GameState;

  /** Available actions (may be undefined) */
  readonly actions?: Action[];

  /** The role assigned to the agent */
  readonly role: AgentRole;

  /** The task the agent is operating within */
  readonly task: PolarisEngineTask;

  /** Incoming message from a previous layer (undefined for Layer 1 first iteration) */
  readonly incomingMessage?: LayerMessage;

  /** Current pipeline iteration (used by DecayParameter) */
  readonly pipelineIteration?: number;

  /** Decay-adjusted temperature override */
  readonly effectiveTemperature?: number;

  /**
   * Cumulative token usage across ALL layers and iterations so far.
   * Injected by the pipeline. Used by the Orchestrator for ROI-aware routing.
   */
  readonly cumulativeTokenUsage?: CumulativeTokenUsage;
}

/**
 * Token accounting for cost-aware routing.
 */
export interface CumulativeTokenUsage {
  /** Total tokens consumed across all iterations */
  readonly totalTokens: number;

  /** Tokens consumed in the current iteration only */
  readonly currentIterationTokens: number;

  /** Hard token budget ceiling — pipeline must force delivery if exceeded */
  readonly tokenBudget: number;

  /** Remaining tokens before budget exhaustion */
  readonly remainingBudget: number;

  /** Average tokens per iteration (for projection) */
  readonly averageTokensPerIteration: number;
}

/**
 * Strategy for constructing prompts.
 * Each layer type has its own concrete implementation.
 * ZERO conditionals inside BaseAgent regarding prompt construction.
 */
export interface PromptStrategy {
  /**
   * Build the system prompt for the LLM.
   * Defines the agent's identity and behavioral constraints.
   */
  buildSystemPrompt(context: PromptContext): string;

  /**
   * Build the user prompt (the actual request).
   * Contains the state, prior layer outputs, or whatever the layer needs.
   */
  buildUserPrompt(context: PromptContext): string;

  /**
   * The temperature this strategy enforces.
   * Returns undefined to use the agent's configured default.
   * The strategy owns the temperature — not the agent.
   */
  getTemperature(context: PromptContext): number | undefined;

  /**
   * Maximum tokens this strategy recommends.
   * Returns undefined to use the agent's configured default.
   */
  getMaxTokens(context: PromptContext): number | undefined;
}
