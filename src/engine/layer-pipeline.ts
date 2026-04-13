/**
 * LayerPipeline: The core asynchronous engine for Polaris Creativa.
 *
 * Orchestrates the 4-layer pipeline with:
 * - Latency-bounded parallel execution for Layer 1 (AbortController + allSettled)
 * - Strict message isolation between layers
 * - Decay loop with entropy escalation on rerun cycles
 * - Cost-aware routing via cumulative token tracking
 */

import { StrategyAgent } from "../agents/base/strategy-agent";
import { AgentOutput } from "../types/agent-output";
import { GameState } from "../domains/base/game-state";
import { Action } from "../domains/base/action";
import { PolarisEngineTask } from "../types/task";
import {
  LayerType,
  LayerMessage,
  LayerMessageMetadata,
  DivergentPayload,
  DivergentExploration,
  InquisitorPayload,
  SynthesizerPayload,
  OrchestratorPayload,
  DecayState,
  DecayConfig,
  OrchestratorVerdict,
  ValidatedFragment,
  computeNextDecayState,
} from "../types/layer";
import { CumulativeTokenUsage } from "../strategies/prompt-strategy";
import { Logger } from "../utils/logger";
import { EnvironmentConfig } from "../utils/config";
import { PolarisError } from "../errors/base";

// ─── Configuration ───

export interface LayerPipelineConfig {
  /** Task context for the pipeline */
  task: PolarisEngineTask;

  /** Layer 1: Divergent generator agents (executed in parallel) */
  divergentAgents: StrategyAgent[];

  /** Layer 2: Inquisitor agent (single) */
  inquisitorAgent: StrategyAgent;

  /** Layer 3: Synthesizer agent (single) */
  synthesizerAgent: StrategyAgent;

  /** Layer 4: Orchestrator agent (single) */
  orchestratorAgent: StrategyAgent;

  /** Decay parameter configuration */
  decayConfig: DecayConfig;
}

// ─── Result ───

export interface PipelineResult {
  /** The final delivered output (draft text) */
  finalOutput: string;

  /** Total pipeline iterations executed */
  totalIterations: number;

  /** Whether delivery was forced by maxIterations or budget exhaustion */
  forcedDelivery: boolean;

  /** Reason for forced delivery (if applicable) */
  forcedDeliveryReason?:
    | "max_iterations"
    | "budget_exhausted"
    | "insufficient_agents";

  /** Orchestrator verdict from the last iteration */
  lastVerdict: OrchestratorVerdict;

  /** Per-layer timing breakdown for each iteration */
  iterationBreakdowns: IterationBreakdown[];

  /** All agent outputs from the final iteration */
  finalAgentOutputs: AgentOutput[];

  /** Total pipeline execution time in ms */
  totalExecutionTime: number;

  /** Total tokens consumed across all iterations */
  totalTokensConsumed: number;
}

export interface IterationBreakdown {
  iteration: number;
  divergentTimeMs: number;
  inquisitorTimeMs: number;
  synthesizerTimeMs: number;
  orchestratorTimeMs: number;
  totalTimeMs: number;
  verdict: OrchestratorVerdict;
  decayState: DecayState;
  tokensConsumed: number;
  agentsSurvived: number;
  agentsTimedOut: number;
}

// ─── Pipeline Engine ───

export class LayerPipeline {
  private readonly config: LayerPipelineConfig;
  private readonly logger: Logger;

  constructor(config: LayerPipelineConfig) {
    this.validateConfig(config);
    this.config = config;
    this.logger = new Logger(
      "LayerPipeline",
      EnvironmentConfig.POLARIS?.logLevel ?? "info"
    );
  }

  /**
   * Execute the full pipeline with decay loop.
   */
  async execute(
    state: GameState,
    actions?: Action[]
  ): Promise<PipelineResult> {
    const pipelineStart = performance.now();
    const iterationBreakdowns: IterationBreakdown[] = [];
    let allFinalOutputs: AgentOutput[] = [];
    let totalTokensConsumed = 0;
    let lastSynthesizerDraft = "";

    // Initialize decay state
    let decayState: DecayState = {
      iteration: 0,
      maxIterations: this.config.decayConfig.maxIterations,
      temperatureDelta: 0,
      correctionPrompt: "",
      accumulatedDeficiencies: [],
    };

    // The reinjection message for Layer 1 (undefined on first iteration)
    let reinjectionMessage: LayerMessage<OrchestratorPayload> | undefined;

    // ─── DECAY LOOP ───
    while (decayState.iteration < this.config.decayConfig.maxIterations) {
      const iterStart = performance.now();
      const iterTokensBefore = totalTokensConsumed;

      this.logger.info(
        `Pipeline iteration ${decayState.iteration} starting`,
        {
          temperatureDelta: decayState.temperatureDelta,
          totalTokensSoFar: totalTokensConsumed,
          budgetRemaining:
            this.config.decayConfig.tokenBudget - totalTokensConsumed,
        }
      );

      // ── BUDGET CHECK: Abort before starting if budget is exhausted ──
      if (totalTokensConsumed >= this.config.decayConfig.tokenBudget) {
        this.logger.warn("Token budget exhausted before iteration start");
        return this.buildForcedResult(
          lastSynthesizerDraft,
          decayState.iteration,
          "budget_exhausted",
          iterationBreakdowns,
          allFinalOutputs,
          pipelineStart,
          totalTokensConsumed
        );
      }

      // ── LAYER 1: Divergent Generators (parallel + timeout) ──
      const divergentStart = performance.now();
      const divergentResult = await this.executeDivergentLayer(
        state,
        actions,
        decayState,
        reinjectionMessage
      );
      const divergentTime = performance.now() - divergentStart;
      totalTokensConsumed += divergentResult.tokensConsumed;

      // Check minimum survivorship
      if (
        divergentResult.survivedCount <
        this.config.decayConfig.minSurvivingAgents
      ) {
        this.logger.warn(
          `Only ${divergentResult.survivedCount} agents survived (min: ${this.config.decayConfig.minSurvivingAgents})`
        );
        return this.buildForcedResult(
          lastSynthesizerDraft,
          decayState.iteration,
          "insufficient_agents",
          iterationBreakdowns,
          allFinalOutputs,
          pipelineStart,
          totalTokensConsumed
        );
      }

      // ── LAYER 2: Inquisitor (sequential) ──
      const inquisitorStart = performance.now();
      const inquisitorResult = await this.executeInquisitorLayer(
        state,
        actions,
        divergentResult.message,
        decayState
      );
      const inquisitorTime = performance.now() - inquisitorStart;
      totalTokensConsumed += inquisitorResult.tokensConsumed;

      // ── LAYER 3: Synthesizer (sequential) ──
      const synthesizerStart = performance.now();
      const synthesizerResult = await this.executeSynthesizerLayer(
        state,
        actions,
        inquisitorResult.message,
        decayState
      );
      const synthesizerTime = performance.now() - synthesizerStart;
      totalTokensConsumed += synthesizerResult.tokensConsumed;

      // Cache draft for forced delivery fallback
      lastSynthesizerDraft = (
        synthesizerResult.message.payload as SynthesizerPayload
      ).draft;

      // ── LAYER 4: Orchestrator (sequential, cost-aware) ──
      const orchestratorStart = performance.now();

      // Build cumulative token usage snapshot for ROI calculation
      const iterTokens = totalTokensConsumed - iterTokensBefore;
      const completedIterations = decayState.iteration + 1;
      const avgTokensPerIter =
        completedIterations > 0
          ? totalTokensConsumed / completedIterations
          : iterTokens;

      const tokenUsage: CumulativeTokenUsage = {
        totalTokens: totalTokensConsumed,
        currentIterationTokens: iterTokens,
        tokenBudget: this.config.decayConfig.tokenBudget,
        remainingBudget:
          this.config.decayConfig.tokenBudget - totalTokensConsumed,
        averageTokensPerIteration: avgTokensPerIter,
      };

      const orchestratorResult = await this.executeOrchestratorLayer(
        state,
        actions,
        synthesizerResult.message,
        decayState,
        tokenUsage
      );
      const orchestratorTime = performance.now() - orchestratorStart;
      totalTokensConsumed += orchestratorResult.tokensConsumed;

      const verdict = orchestratorResult.verdict;
      const iterTime = performance.now() - iterStart;

      iterationBreakdowns.push({
        iteration: decayState.iteration,
        divergentTimeMs: divergentTime,
        inquisitorTimeMs: inquisitorTime,
        synthesizerTimeMs: synthesizerTime,
        orchestratorTimeMs: orchestratorTime,
        totalTimeMs: iterTime,
        verdict,
        decayState: { ...decayState },
        tokensConsumed: totalTokensConsumed - iterTokensBefore,
        agentsSurvived: divergentResult.survivedCount,
        agentsTimedOut: divergentResult.timedOutCount,
      });

      this.logger.info(
        `Pipeline iteration ${decayState.iteration} complete`,
        {
          verdict: verdict.decision,
          errorDelta: verdict.errorDelta,
          iterTimeMs: iterTime,
          iterTokens: totalTokensConsumed - iterTokensBefore,
          totalTokens: totalTokensConsumed,
        }
      );

      allFinalOutputs = orchestratorResult.allOutputs;

      // ── DECISION GATE ──
      if (verdict.decision === "deliver") {
        return {
          finalOutput: lastSynthesizerDraft,
          totalIterations: decayState.iteration + 1,
          forcedDelivery: false,
          lastVerdict: verdict,
          iterationBreakdowns,
          finalAgentOutputs: allFinalOutputs,
          totalExecutionTime: performance.now() - pipelineStart,
          totalTokensConsumed,
        };
      }

      // ── BUDGET CHECK: Can we afford another iteration? ──
      const budgetRemaining =
        this.config.decayConfig.tokenBudget - totalTokensConsumed;
      if (budgetRemaining < avgTokensPerIter) {
        this.logger.warn(
          `Budget insufficient for another iteration (remaining: ${budgetRemaining}, avg: ${avgTokensPerIter})`
        );
        return this.buildForcedResult(
          lastSynthesizerDraft,
          decayState.iteration + 1,
          "budget_exhausted",
          iterationBreakdowns,
          allFinalOutputs,
          pipelineStart,
          totalTokensConsumed
        );
      }

      // ── DECAY: Compute next state ──
      decayState = computeNextDecayState(
        decayState,
        this.config.decayConfig,
        verdict
      );

      reinjectionMessage = this.buildLayerMessage<OrchestratorPayload>(
        LayerType.ORCHESTRATOR,
        LayerType.DIVERGENT,
        { verdict, decayState },
        ["orchestrator"],
        decayState.iteration
      );
    }

    // ── FORCED DELIVERY: maxIterations reached ──
    return this.buildForcedResult(
      lastSynthesizerDraft,
      this.config.decayConfig.maxIterations,
      "max_iterations",
      iterationBreakdowns,
      allFinalOutputs,
      pipelineStart,
      totalTokensConsumed
    );
  }

  // ─── Layer Executors ───

  private async executeDivergentLayer(
    state: GameState,
    actions: Action[] | undefined,
    decayState: DecayState,
    reinjectionMessage?: LayerMessage<OrchestratorPayload>
  ): Promise<{
    message: LayerMessage<DivergentPayload>;
    tokensConsumed: number;
    survivedCount: number;
    timedOutCount: number;
  }> {
    const agents = this.config.divergentAgents;
    const timeoutMs = this.config.decayConfig.agentTimeoutMs;

    // Inject decay parameters and reinjection message
    for (const agent of agents) {
      agent.setDecayParameters(
        decayState.iteration,
        decayState.temperatureDelta
      );
      agent.setLayerMessage(
        reinjectionMessage as LayerMessage<unknown> | undefined
      );
    }

    // Execute with per-agent timeout using AbortController
    const agentPromises = agents.map((agent) => {
      const controller = new AbortController();
      const timeoutId =
        timeoutMs < Infinity
          ? setTimeout(() => controller.abort(), timeoutMs)
          : undefined;

      // Inject abort signal if the agent supports it
      if (
        "setAbortSignal" in agent &&
        typeof (agent as any).setAbortSignal === "function"
      ) {
        (agent as any).setAbortSignal(controller.signal);
      }

      return agent
        .evaluate(state, actions)
        .then((output) => {
          if (timeoutId !== undefined) clearTimeout(timeoutId);
          return { status: "fulfilled" as const, output, agent };
        })
        .catch((error) => {
          if (timeoutId !== undefined) clearTimeout(timeoutId);
          return { status: "rejected" as const, error, agent };
        });
    });

    const results = await Promise.all(agentPromises);

    // Partition: survivors vs. timed-out/failed
    const survived: { output: AgentOutput; agent: StrategyAgent }[] = [];
    let timedOutCount = 0;

    for (const result of results) {
      if (result.status === "fulfilled" && !result.output.error?.hasError) {
        survived.push({ output: result.output, agent: result.agent });
      } else {
        timedOutCount++;
        this.logger.warn(
          `Agent ${result.agent.id} failed/timed out in Layer 1`
        );
      }
    }

    // Calculate tokens consumed by survived agents (REAL token counts)
    const tokensConsumed = survived.reduce(
      (sum, s) => sum + (s.output.processing?.tokensUsed ?? 0),
      0
    );

    // Assemble payload from survivors only
    const explorations: DivergentExploration[] = survived.map((s) => ({
      rawContent:
        s.output.metadata?.rawContent ??
        s.output.evaluation.reasoning ??
        "",
      agentId: s.output.agentId,
      heuristicLabel: s.agent.role.name,
    }));

    const message = this.buildLayerMessage<DivergentPayload>(
      LayerType.DIVERGENT,
      LayerType.INQUISITOR,
      { explorations },
      survived.map((s) => s.output.agentId),
      decayState.iteration
    );

    return {
      message,
      tokensConsumed,
      survivedCount: survived.length,
      timedOutCount,
    };
  }

  private async executeInquisitorLayer(
    state: GameState,
    actions: Action[] | undefined,
    divergentMessage: LayerMessage<DivergentPayload>,
    decayState: DecayState
  ): Promise<{
    message: LayerMessage<InquisitorPayload>;
    tokensConsumed: number;
  }> {
    const agent = this.config.inquisitorAgent;

    agent.setLayerMessage(divergentMessage as LayerMessage<unknown>);
    agent.setDecayParameters(decayState.iteration, 0);

    const output = await agent.evaluate(state, actions);

    const fragments: ValidatedFragment[] =
      output.metadata?.validatedFragments ?? [];

    const totalEvaluated = (
      divergentMessage.payload as DivergentPayload
    ).explorations.length;

    const message = this.buildLayerMessage<InquisitorPayload>(
      LayerType.INQUISITOR,
      LayerType.SYNTHESIZER,
      {
        validatedFragments: fragments,
        filterMetrics: {
          totalEvaluated,
          accepted: fragments.length,
          rejected: totalEvaluated - fragments.length,
        },
      },
      [output.agentId],
      decayState.iteration
    );

    // Use REAL token count from agent output
    const tokensConsumed = output.processing?.tokensUsed ?? 0;

    return { message, tokensConsumed };
  }

  private async executeSynthesizerLayer(
    state: GameState,
    actions: Action[] | undefined,
    inquisitorMessage: LayerMessage<InquisitorPayload>,
    decayState: DecayState
  ): Promise<{
    message: LayerMessage<SynthesizerPayload>;
    tokensConsumed: number;
  }> {
    const agent = this.config.synthesizerAgent;

    agent.setLayerMessage(inquisitorMessage as LayerMessage<unknown>);
    agent.setDecayParameters(decayState.iteration, 0);

    const output = await agent.evaluate(state, actions);

    const draft: string =
      output.metadata?.synthesizedDraft ??
      output.evaluation.reasoning ??
      "";

    const sectionMatches = draft.match(/^#{1,3}\s+.+$/gm);
    const sectionCount = sectionMatches ? sectionMatches.length : 1;
    const estimatedTokens = Math.ceil(draft.length / 4);

    const message = this.buildLayerMessage<SynthesizerPayload>(
      LayerType.SYNTHESIZER,
      LayerType.ORCHESTRATOR,
      { draft, structure: { sectionCount, estimatedTokens } },
      [output.agentId],
      decayState.iteration
    );

    // Use REAL token count from agent output
    const tokensConsumed = output.processing?.tokensUsed ?? 0;

    return { message, tokensConsumed };
  }

  private async executeOrchestratorLayer(
    state: GameState,
    actions: Action[] | undefined,
    synthesizerMessage: LayerMessage<SynthesizerPayload>,
    decayState: DecayState,
    tokenUsage: CumulativeTokenUsage
  ): Promise<{
    verdict: OrchestratorVerdict;
    allOutputs: AgentOutput[];
    tokensConsumed: number;
  }> {
    const agent = this.config.orchestratorAgent;

    agent.setLayerMessage(synthesizerMessage as LayerMessage<unknown>);
    agent.setDecayParameters(decayState.iteration, 0);
    agent.setTokenUsage(tokenUsage);

    const output = await agent.evaluate(state, actions);

    const verdict: OrchestratorVerdict =
      output.metadata?.orchestratorVerdict ?? {
        decision: "rerun",
        errorDelta: 0.8,
        deficiencies: ["Orchestrator output missing verdict metadata"],
        correctionPrompt: "Re-examine the problem from scratch.",
      };

    const tokensConsumed = output.processing?.tokensUsed ?? 0;

    return { verdict, allOutputs: [output], tokensConsumed };
  }

  // ─── Utilities ───

  private buildForcedResult(
    draft: string,
    iterations: number,
    reason: "max_iterations" | "budget_exhausted" | "insufficient_agents",
    breakdowns: IterationBreakdown[],
    outputs: AgentOutput[],
    pipelineStart: number,
    totalTokens: number
  ): PipelineResult {
    return {
      finalOutput: draft || "[No draft was produced]",
      totalIterations: iterations,
      forcedDelivery: true,
      forcedDeliveryReason: reason,
      lastVerdict: {
        decision: "deliver",
        errorDelta: 1.0,
        deficiencies: [
          `Forced delivery: ${reason.replace(/_/g, " ")}`,
        ],
      },
      iterationBreakdowns: breakdowns,
      finalAgentOutputs: outputs,
      totalExecutionTime: performance.now() - pipelineStart,
      totalTokensConsumed: totalTokens,
    };
  }

  private buildLayerMessage<T>(
    source: LayerType,
    target: LayerType,
    payload: T,
    sourceAgentIds: string[],
    pipelineIteration: number
  ): LayerMessage<T> {
    const payloadStr = JSON.stringify(payload);
    const estimatedTokens = Math.ceil(payloadStr.length / 4);

    const metadata: LayerMessageMetadata = {
      tokenCount: estimatedTokens,
      timestamp: new Date().toISOString(),
      sourceAgentIds,
      pipelineIteration,
    };

    return { sourceLayer: source, targetLayer: target, payload, metadata };
  }

  // ─── Validation ───

  private validateConfig(config: LayerPipelineConfig): void {
    if (config.divergentAgents.length === 0) {
      throw new PolarisError(
        "LayerPipeline requires at least one divergent agent (Layer 1)",
        "PIPELINE_CONFIG_ERROR"
      );
    }
    if (!config.inquisitorAgent) {
      throw new PolarisError(
        "LayerPipeline requires an inquisitor agent (Layer 2)",
        "PIPELINE_CONFIG_ERROR"
      );
    }
    if (!config.synthesizerAgent) {
      throw new PolarisError(
        "LayerPipeline requires a synthesizer agent (Layer 3)",
        "PIPELINE_CONFIG_ERROR"
      );
    }
    if (!config.orchestratorAgent) {
      throw new PolarisError(
        "LayerPipeline requires an orchestrator agent (Layer 4)",
        "PIPELINE_CONFIG_ERROR"
      );
    }
    if (config.decayConfig.maxIterations < 1) {
      throw new PolarisError(
        "DecayConfig.maxIterations must be >= 1",
        "PIPELINE_CONFIG_ERROR"
      );
    }
    if (
      config.decayConfig.temperatureCeiling <=
      config.decayConfig.baseTemperature
    ) {
      throw new PolarisError(
        "DecayConfig.temperatureCeiling must be > baseTemperature",
        "PIPELINE_CONFIG_ERROR"
      );
    }
    if (config.decayConfig.tokenBudget <= 0) {
      throw new PolarisError(
        "DecayConfig.tokenBudget must be > 0",
        "PIPELINE_CONFIG_ERROR"
      );
    }
    if (config.decayConfig.agentTimeoutMs <= 0) {
      throw new PolarisError(
        "DecayConfig.agentTimeoutMs must be > 0",
        "PIPELINE_CONFIG_ERROR"
      );
    }
    if (
      config.decayConfig.minSurvivingAgents < 1 ||
      config.decayConfig.minSurvivingAgents >
        config.divergentAgents.length
    ) {
      throw new PolarisError(
        `DecayConfig.minSurvivingAgents must be between 1 and ${config.divergentAgents.length}`,
        "PIPELINE_CONFIG_ERROR"
      );
    }
  }
}
