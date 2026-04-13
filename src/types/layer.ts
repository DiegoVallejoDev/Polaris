/**
 * Layer message types for strict message-passing between pipeline layers.
 * Enforces context isolation — each layer only sees its predecessor's filtered payload.
 *
 * IMPORTANT: ValidatedFragment and OrchestratorVerdict are defined HERE
 * (not in strategies/) to avoid circular dependencies, since both
 * types/layer.ts and strategies/*.ts need them.
 */

/**
 * Enumeration of layer types in the pipeline.
 */
export enum LayerType {
  DIVERGENT = "divergent",
  INQUISITOR = "inquisitor",
  SYNTHESIZER = "synthesizer",
  ORCHESTRATOR = "orchestrator",
}

/**
 * A message passed between layers. Strict isolation: each message
 * contains ONLY the output of the immediately preceding layer.
 */
export interface LayerMessage<T = unknown> {
  /** Which layer produced this message */
  readonly sourceLayer: LayerType;

  /** Which layer should consume this message */
  readonly targetLayer: LayerType;

  /** The typed payload — polymorphic per layer transition */
  readonly payload: T;

  /** Transport metadata (never contains cross-layer context) */
  readonly metadata: LayerMessageMetadata;
}

export interface LayerMessageMetadata {
  /** Estimated token count of the payload */
  readonly tokenCount: number;

  /** When this message was created */
  readonly timestamp: string;

  /** Agent IDs that contributed to this payload */
  readonly sourceAgentIds: string[];

  /** Current pipeline iteration (for decay tracking) */
  readonly pipelineIteration: number;
}

// ─── Shared types used by both layers and strategies ───

/**
 * A fragment that survived the Inquisitor's logical filter.
 * Defined here to avoid circular dependency between types/ and strategies/.
 */
export interface ValidatedFragment {
  /** The validated content text */
  readonly content: string;

  /** Which agent produced the original exploration */
  readonly sourceAgentId: string;

  /** Why this fragment was accepted */
  readonly justification: string;

  /** Coherence score assigned by the Inquisitor (0-1) */
  readonly coherenceScore: number;
}

/**
 * The Orchestrator's decision output.
 * Defined here to avoid circular dependency between types/ and strategies/.
 */
export interface OrchestratorVerdict {
  /** Whether to deliver the current draft or rerun the pipeline */
  readonly decision: "deliver" | "rerun";

  /** Error delta: distance between requirement and delivery (0-1) */
  readonly errorDelta: number;

  /** Specific deficiencies identified (if rerunning) */
  readonly deficiencies?: string[];

  /** Correction instruction for creative agents (if rerunning) */
  readonly correctionPrompt?: string;
}

// ─── Typed payloads for each layer transition ───

/**
 * Layer 1 → Layer 2: Raw divergent explorations.
 */
export interface DivergentPayload {
  /** One raw exploration per divergent agent */
  readonly explorations: DivergentExploration[];
}

export interface DivergentExploration {
  /** The raw text output from the divergent agent */
  readonly rawContent: string;

  /** Which agent produced this */
  readonly agentId: string;

  /** The heuristic constraint this agent operated under */
  readonly heuristicLabel: string;
}

/**
 * Layer 2 → Layer 3: Validated, filtered fragments.
 */
export interface InquisitorPayload {
  /** Fragments that survived the logical filter */
  readonly validatedFragments: ValidatedFragment[];

  /** Count of total fragments evaluated vs. accepted */
  readonly filterMetrics: {
    readonly totalEvaluated: number;
    readonly accepted: number;
    readonly rejected: number;
  };
}

/**
 * Layer 3 → Layer 4: The synthesized draft.
 */
export interface SynthesizerPayload {
  /** The unified draft assembled from validated fragments */
  readonly draft: string;

  /** Structural metadata about the draft */
  readonly structure: {
    readonly sectionCount: number;
    readonly estimatedTokens: number;
  };
}

/**
 * Layer 4 → Layer 1 (reinjection) OR → Output (delivery).
 */
export interface OrchestratorPayload {
  /** The orchestrator's verdict */
  readonly verdict: OrchestratorVerdict;

  /** If rerunning: the decay-adjusted parameters for the next iteration */
  readonly decayState?: DecayState;

  /** If delivering: the final output */
  readonly finalOutput?: string;
}

// ─── Decay Parameter System ───

/**
 * Decay state that evolves across pipeline iterations.
 * Controls entropy injection to force exploration of distinct latent vectors.
 */
export interface DecayState {
  /** Current pipeline iteration (0-indexed) */
  readonly iteration: number;

  /** Maximum allowed iterations before forced delivery */
  readonly maxIterations: number;

  /** Current temperature delta applied to Layer 1 agents */
  readonly temperatureDelta: number;

  /** The differential correction prompt from the Orchestrator */
  readonly correctionPrompt: string;

  /** Accumulated deficiency tags from all iterations */
  readonly accumulatedDeficiencies: string[];
}

/**
 * Configuration for the Decay Parameter mechanism.
 */
export interface DecayConfig {
  /** Maximum pipeline iterations before forced delivery */
  readonly maxIterations: number;

  /** Base temperature for Layer 1 agents on first iteration */
  readonly baseTemperature: number;

  /**
   * Temperature increment per failed iteration.
   * Applied as: T_effective = min(baseTemperature + (iteration * increment), ceiling)
   */
  readonly temperatureIncrement: number;

  /** Absolute ceiling for temperature (prevents degenerate outputs) */
  readonly temperatureCeiling: number;

  /**
   * Prompt mutation factor: controls how aggressively the correction
   * prompt diverges from the original on each iteration.
   * Range: 0.0 (no mutation) to 1.0 (maximum divergence).
   */
  readonly promptMutationFactor: number;

  /**
   * Hard token budget for the entire pipeline execution.
   * If cumulative usage exceeds this, the pipeline forces delivery
   * regardless of the Orchestrator's verdict.
   * Set to Infinity to disable budget enforcement.
   */
  readonly tokenBudget: number;

  /**
   * Per-agent timeout in milliseconds for Layer 1 parallel execution.
   * Agents that exceed this deadline are pruned from the iteration.
   * Set to Infinity to disable timeout enforcement.
   */
  readonly agentTimeoutMs: number;

  /**
   * Minimum number of divergent agents that must return successfully
   * for the iteration to proceed. If fewer survive the timeout,
   * the pipeline forces delivery with available data.
   */
  readonly minSurvivingAgents: number;
}

/**
 * Pure function: computes the next DecayState from the current one.
 * Stateless — the pipeline calls this between iterations.
 */
export function computeNextDecayState(
  current: DecayState,
  config: DecayConfig,
  orchestratorVerdict: OrchestratorVerdict
): DecayState {
  const nextIteration = current.iteration + 1;

  // Temperature grows linearly, clamped to ceiling
  const nextTemperatureDelta = Math.min(
    config.temperatureIncrement * nextIteration,
    config.temperatureCeiling - config.baseTemperature
  );

  // Accumulate deficiencies across iterations (no duplicates)
  const mergedDeficiencies = Array.from(
    new Set([
      ...current.accumulatedDeficiencies,
      ...(orchestratorVerdict.deficiencies ?? []),
    ])
  );

  // Mutate the correction prompt based on mutation factor
  const mutationPrefix =
    config.promptMutationFactor > 0.5
      ? "CRITICAL CHANGE REQUIRED — previous approaches have failed. You MUST explore a fundamentally different angle. "
      : "Refinement needed — adjust your approach based on the following feedback. ";

  const nextCorrectionPrompt =
    `${mutationPrefix}` +
    `Iteration ${nextIteration}/${config.maxIterations}. ` +
    `Deficiencies to address: [${mergedDeficiencies.join("; ")}]. ` +
    `${orchestratorVerdict.correctionPrompt ?? ""}`;

  return {
    iteration: nextIteration,
    maxIterations: current.maxIterations,
    temperatureDelta: nextTemperatureDelta,
    correctionPrompt: nextCorrectionPrompt,
    accumulatedDeficiencies: mergedDeficiencies,
  };
}
