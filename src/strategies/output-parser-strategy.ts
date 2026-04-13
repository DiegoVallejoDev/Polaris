/**
 * Strategy interface for parsing raw LLM responses into typed outputs.
 * Each layer has its own concrete parser — the agent delegates entirely.
 *
 * ValidatedFragment and OrchestratorVerdict are imported from types/layer.ts
 * (defined there to avoid circular dependencies).
 */

import { EvaluationResult } from "../types/evaluation";
import { ValidatedFragment, OrchestratorVerdict } from "../types/layer";

// Re-export for convenience — consumers can import from either location
export type { ValidatedFragment, OrchestratorVerdict } from "../types/layer";

/**
 * Raw response from an LLM provider, before any parsing.
 */
export interface RawLLMResponse {
  /** The raw text content returned by the LLM */
  readonly content: string;

  /** Tokens consumed (if reported by the provider) */
  readonly tokensUsed?: number;

  /** Model identifier */
  readonly model?: string;

  /** Wall-clock processing time in ms */
  readonly processingTime: number;

  /** ID of the agent that made the request */
  readonly agentId: string;
}

/**
 * Parsed output from a strategy's output parser.
 * Each layer populates the fields relevant to its output type.
 * The agent attaches these to AgentOutput.metadata without conditionals.
 */
export interface ParsedOutput {
  /** Evaluation result (always present) */
  readonly evaluation: EvaluationResult;

  /** Raw content text (Layer 1: divergent exploration) */
  readonly rawContent?: string;

  /** Validated fragments (Layer 2: inquisitor filter output) */
  readonly validatedFragments?: ValidatedFragment[];

  /** Synthesized draft text (Layer 3: synthesizer output) */
  readonly synthesizedDraft?: string;

  /** Orchestrator verdict (Layer 4: routing decision) */
  readonly orchestratorVerdict?: OrchestratorVerdict;
}

/**
 * Strategy for parsing raw LLM responses.
 * Each layer type has its own concrete implementation.
 */
export interface OutputParserStrategy {
  /**
   * Parse a raw LLM response into a typed ParsedOutput.
   * The strategy is responsible for extracting structured data
   * from the (potentially messy) LLM output.
   */
  parse(response: RawLLMResponse): ParsedOutput;
}
