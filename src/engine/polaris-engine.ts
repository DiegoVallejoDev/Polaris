/**
 * New unified PolarisEngine class following the refactoring plan
 */

import { Agent } from "../agents/base/agent";
import { SentinelAgent } from "../sentinel/sentinel";
import { PolarisEngineTask } from "../types/task";
import {
  AgentOutput,
  EngineOutput,
  MultiAgentOutput,
} from "../types/agent-output";
import { GameState } from "../domains/base/game-state";
import { Action } from "../domains/base/action";

import { Logger } from "../utils/logger";
import { EnvironmentConfig } from "../utils/config";
import { PolarisError } from "../errors/base";

/**
 * Configuration for the PolarisEngine
 */
export interface PolarisEngineConfig {
  /** Task configuration */
  task: PolarisEngineTask;

  /** Agents to use for inference */
  agents: Agent[];

  /** Optional sentinel agent for analysis */
  sentinelAgent?: SentinelAgent;

  /** Engine-specific configuration */
  engineConfig?: {
    /** Maximum inference iterations */
    maxIterations?: number;

    /** Time limit for inference (ms) */
    timeLimit?: number;

    /** Diversity threshold for agent outputs */
    diversityThreshold?: number;

    /** Consensus threshold for decision making */
    consensusThreshold?: number;

    /** Whether to run agents in parallel */
    parallel?: boolean;

    /** Minimum number of successful agent outputs required */
    minSuccessfulOutputs?: number;
  };

  /** Additional configuration */
  metadata?: Record<string, any>;
}

/**
 * Inference parameters for the engine
 */
export interface InferenceParams {
  /** Current game state to analyze */
  state: GameState;

  /** Available actions (optional) */
  actions?: Action[];

  /** Specific agents to use (if not all) */
  agentIds?: string[];

  /** Override engine configuration for this inference */
  configOverride?: Partial<PolarisEngineConfig["engineConfig"]>;

  /** Additional context */
  context?: Record<string, any>;
}

/**
 * Main PolarisEngine class for coordinating multi-agent inference
 */
export class PolarisEngine {
  private config: PolarisEngineConfig;
  private agents: Map<string, Agent>;
  private sentinelAgent?: SentinelAgent;
  private logger: Logger;
  private sessionId: string;

  constructor(config: PolarisEngineConfig) {
    this.config = { ...config };
    this.agents = new Map();
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Initialize logger
    this.logger = new Logger(
      `PolarisEngine-${this.sessionId}`,
      EnvironmentConfig.POLARIS.logLevel
    );

    // Validate and register agents
    this.validateAndRegisterAgents(config.agents);

    // Set sentinel agent if provided
    if (config.sentinelAgent) {
      this.sentinelAgent = config.sentinelAgent;
    }

    // Apply default engine configuration
    this.config.engineConfig = {
      maxIterations: 100,
      timeLimit: 30000,
      diversityThreshold: 0.3,
      consensusThreshold: 0.7,
      parallel: true,
      minSuccessfulOutputs: 1,
      ...config.engineConfig,
    };

    this.logger.info("PolarisEngine initialized", {
      sessionId: this.sessionId,
      taskId: this.config.task.id,
      taskName: this.config.task.name,
      agentCount: this.agents.size,
      hasSentinel: !!this.sentinelAgent,
      config: this.config.engineConfig,
    });
  }

  /**
   * Main inference method
   */
  async inference(params: InferenceParams): Promise<EngineOutput> {
    const startTime = performance.now();

    try {
      this.logger.info("Starting inference", {
        stateId: params.state.id,
        actionsCount: params.actions?.length || 0,
        requestedAgents: params.agentIds?.length || "all",
      });

      // Validate input
      this.validateInferenceParams(params);

      // Determine which agents to use
      const selectedAgents = this.selectAgentsForInference(params.agentIds);

      // Get effective configuration
      const effectiveConfig = {
        ...this.config.engineConfig,
        ...params.configOverride,
      };

      // Run agents
      const multiAgentOutput = await this.runAgents(
        selectedAgents,
        params.state,
        params.actions,
        effectiveConfig
      );

      // Run sentinel analysis if available
      const sentinelAnalysis = await this.runSentinelAnalysis(
        multiAgentOutput,
        params.state,
        params.actions
      );

      // Calculate engine statistics
      const totalInferenceTime = performance.now() - startTime;
      const engineStatistics = {
        totalInferenceTime,
        searchStats: {
          agentsUsed: selectedAgents.length,
          successfulOutputs: multiAgentOutput.summary.successfulAgents,
          failedOutputs: multiAgentOutput.summary.failedAgents,
        },
        memoryUsage: this.estimateMemoryUsage(),
        coordinationStats: {
          parallelExecution: effectiveConfig.parallel ? 1 : 0,
          averageAgentTime:
            multiAgentOutput.summary.totalProcessingTime /
            multiAgentOutput.summary.totalAgents,
        },
      };

      // Build agent performance map
      const agentPerformance = this.buildAgentPerformanceMap(
        multiAgentOutput.agentOutputs
      );

      // Generate recommendation
      const recommendation = this.generateRecommendation(
        multiAgentOutput,
        sentinelAnalysis,
        params.actions
      );

      // Build final output
      const engineOutput: EngineOutput = {
        agentOutputs: multiAgentOutput.agentOutputs,
        engineStatistics,
        agentPerformance,
        session: {
          sessionId: this.sessionId,
          task: {
            id: this.config.task.id,
            name: this.config.task.name,
            domain: this.config.task.domain.id,
          },
          config: effectiveConfig,
          timestamp: new Date().toISOString(),
        },
      };

      if (sentinelAnalysis) {
        engineOutput.sentinelAnalysis = sentinelAnalysis;
      }

      if (recommendation) {
        engineOutput.recommendation = recommendation;
      }

      this.logger.info("Inference completed", {
        totalTime: totalInferenceTime,
        agentsUsed: selectedAgents.length,
        successful: multiAgentOutput.summary.successfulAgents,
        recommendation: recommendation?.action?.toString(),
      });

      return engineOutput;
    } catch (error) {
      this.logger.error("Inference failed", error);
      throw new PolarisError(`Inference failed: ${error}`, "INFERENCE_FAILED", {
        sessionId: this.sessionId,
        params,
      });
    }
  }

  /**
   * Get engine configuration
   */
  getConfig(): PolarisEngineConfig {
    return { ...this.config };
  }

  /**
   * Update engine configuration
   */
  updateConfig(updates: Partial<PolarisEngineConfig>): void {
    this.config = { ...this.config, ...updates };

    if (updates.agents) {
      this.validateAndRegisterAgents(updates.agents);
    }

    if (updates.sentinelAgent !== undefined) {
      this.sentinelAgent = updates.sentinelAgent;
    }

    this.logger.info("Configuration updated", updates);
  }

  /**
   * Add an agent to the engine
   */
  addAgent(agent: Agent): void {
    if (this.agents.has(agent.id)) {
      throw new PolarisError(`Agent with ID ${agent.id} already exists`);
    }

    this.agents.set(agent.id, agent);
    this.config.agents.push(agent);

    this.logger.info("Agent added", {
      agentId: agent.id,
      agentName: agent.name,
      role: agent.role.name,
    });
  }

  /**
   * Remove an agent from the engine
   */
  removeAgent(agentId: string): boolean {
    const removed = this.agents.delete(agentId);
    if (removed) {
      this.config.agents = this.config.agents.filter(
        (agent) => agent.id !== agentId
      );
      this.logger.info("Agent removed", { agentId });
    }
    return removed;
  }

  /**
   * Get all agents
   */
  getAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    this.logger.info("Cleaning up PolarisEngine");

    // Cleanup all agents
    for (const agent of this.agents.values()) {
      if (agent.cleanup) {
        try {
          await agent.cleanup();
        } catch (error) {
          this.logger.warn(`Failed to cleanup agent ${agent.id}`, error);
        }
      }
    }

    // Cleanup sentinel (if it has cleanup method)
    if (
      this.sentinelAgent &&
      "cleanup" in this.sentinelAgent &&
      typeof this.sentinelAgent.cleanup === "function"
    ) {
      try {
        await this.sentinelAgent.cleanup();
      } catch (error) {
        this.logger.warn("Failed to cleanup sentinel", error);
      }
    }

    this.logger.info("PolarisEngine cleanup completed");
  }

  // Private helper methods

  private validateAndRegisterAgents(agents: Agent[]): void {
    if (agents.length === 0) {
      throw new PolarisError("At least one agent is required");
    }

    // Clear existing agents
    this.agents.clear();

    // Validate and register each agent
    for (const agent of agents) {
      if (!agent.id || !agent.name || !agent.type) {
        throw new PolarisError(`Invalid agent configuration: ${agent}`);
      }

      // Verify agent task matches engine task
      if (agent.task.id !== this.config.task.id) {
        this.logger.warn(`Agent ${agent.id} task mismatch`, {
          agentTask: agent.task.id,
          engineTask: this.config.task.id,
        });
      }

      this.agents.set(agent.id, agent);
    }

    this.logger.info(`Registered ${this.agents.size} agents`);
  }

  private validateInferenceParams(params: InferenceParams): void {
    if (!params.state) {
      throw new PolarisError("State is required for inference");
    }

    if (params.state.isTerminal) {
      throw new PolarisError("Cannot perform inference on terminal state");
    }

    if (params.agentIds) {
      const invalidIds = params.agentIds.filter((id) => !this.agents.has(id));
      if (invalidIds.length > 0) {
        throw new PolarisError(`Unknown agent IDs: ${invalidIds.join(", ")}`);
      }
    }
  }

  private selectAgentsForInference(requestedAgentIds?: string[]): Agent[] {
    if (requestedAgentIds) {
      return requestedAgentIds.map((id) => this.agents.get(id)!);
    }

    return Array.from(this.agents.values()).filter((agent) => agent.isReady());
  }

  private async runAgents(
    agents: Agent[],
    state: GameState,
    actions?: Action[],
    config?: PolarisEngineConfig["engineConfig"]
  ): Promise<MultiAgentOutput> {
    if (config?.parallel) {
      return this.runAgentsParallel(agents, state, actions, config);
    } else {
      return this.runAgentsSequential(agents, state, actions, config);
    }
  }

  private async runAgentsParallel(
    agents: Agent[],
    state: GameState,
    actions?: Action[],
    _config?: PolarisEngineConfig["engineConfig"]
  ): Promise<MultiAgentOutput> {
    const promises = agents.map(async (agent): Promise<AgentOutput> => {
      try {
        return await agent.evaluate(state, actions);
      } catch (error) {
        this.logger.warn(`Agent ${agent.id} failed`, error);
        // Return error output
        return {
          agentId: agent.id,
          agentName: agent.name,
          providerType: agent.type,
          evaluation: {
            agentId: agent.id,
            score: 0.5,
            confidence: 0.1,
            reasoning: `Agent failed: ${error}`,
          },
          timestamp: new Date().toISOString(),
          error: {
            hasError: true,
            message: String(error),
          },
        };
      }
    });

    const agentOutputs = await Promise.all(promises);

    return this.buildMultiAgentOutput(agentOutputs);
  }

  private async runAgentsSequential(
    agents: Agent[],
    state: GameState,
    actions?: Action[],
    _config?: PolarisEngineConfig["engineConfig"]
  ): Promise<MultiAgentOutput> {
    const agentOutputs: AgentOutput[] = [];

    for (const agent of agents) {
      try {
        const output = await agent.evaluate(state, actions);
        agentOutputs.push(output);
      } catch (error) {
        this.logger.warn(`Agent ${agent.id} failed`, error);
        agentOutputs.push({
          agentId: agent.id,
          agentName: agent.name,
          providerType: agent.type,
          evaluation: {
            agentId: agent.id,
            score: 0.5,
            confidence: 0.1,
            reasoning: `Agent failed: ${error}`,
          },
          timestamp: new Date().toISOString(),
          error: {
            hasError: true,
            message: String(error),
          },
        });
      }
    }

    return this.buildMultiAgentOutput(agentOutputs);
  }

  private buildMultiAgentOutput(agentOutputs: AgentOutput[]): MultiAgentOutput {
    const totalProcessingTime = agentOutputs.reduce(
      (sum, output) => sum + (output.processing?.processingTime || 0),
      0
    );

    const successfulOutputs = agentOutputs.filter(
      (output) => !output.error?.hasError
    );
    const failedOutputs = agentOutputs.filter(
      (output) => output.error?.hasError
    );

    const averageConfidence =
      successfulOutputs.length > 0
        ? successfulOutputs.reduce(
            (sum, output) => sum + output.evaluation.confidence,
            0
          ) / successfulOutputs.length
        : 0;

    // Calculate diversity metrics
    const diversity = this.calculateDiversityMetrics(successfulOutputs);

    const result: MultiAgentOutput = {
      agentOutputs,
      summary: {
        totalAgents: agentOutputs.length,
        successfulAgents: successfulOutputs.length,
        failedAgents: failedOutputs.length,
        totalProcessingTime,
        averageConfidence,
      },
      timestamp: new Date().toISOString(),
    };

    if (diversity) {
      result.diversity = diversity;
    }

    return result;
  }

  private calculateDiversityMetrics(
    outputs: AgentOutput[]
  ): MultiAgentOutput["diversity"] {
    if (outputs.length < 2) {
      return {
        scoreVariance: 0,
        opinionDivergence: 0,
        approachDiversity: 0,
      };
    }

    const scores = outputs.map((output) => output.evaluation.score);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const scoreVariance = Math.sqrt(
      scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) /
        scores.length
    );

    // Simple opinion divergence based on reasoning similarity
    const reasonings = outputs.map(
      (output) => output.evaluation.reasoning || ""
    );
    const opinionDivergence = this.calculateTextDiversity(reasonings);

    // Approach diversity based on provider types
    const providers = outputs.map((output) => output.providerType);
    const uniqueProviders = new Set(providers);
    const approachDiversity = uniqueProviders.size / outputs.length;

    return {
      scoreVariance,
      opinionDivergence,
      approachDiversity,
    };
  }

  private calculateTextDiversity(texts: string[]): number {
    // Simple text diversity calculation
    // In a full implementation, this could use more sophisticated NLP techniques
    const uniqueWords = new Set(
      texts
        .join(" ")
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 3)
    );

    const totalWords = texts.join(" ").split(/\s+/).length;
    return totalWords > 0 ? uniqueWords.size / totalWords : 0;
  }

  private async runSentinelAnalysis(
    multiAgentOutput: MultiAgentOutput,
    _state: GameState,
    _actions?: Action[]
  ): Promise<EngineOutput["sentinelAnalysis"]> {
    if (!this.sentinelAgent) {
      return undefined;
    }

    try {
      // This would use the actual sentinel agent interface
      // For now, we'll create a simple analysis
      const diversity = multiAgentOutput.diversity;
      const hasHighDiversity =
        diversity &&
        diversity.scoreVariance >
          (this.config.engineConfig?.diversityThreshold || 0.3);

      return {
        biasDetected: false, // Would be calculated by sentinel
        diversityScore: diversity?.scoreVariance || 0,
        qualityScore: multiAgentOutput.summary.averageConfidence,
        recommendations: hasHighDiversity
          ? ["High diversity detected - consider additional analysis"]
          : ["Agent consensus achieved"],
        analysis: {
          diversityMetrics: diversity,
          agentConsensus: !hasHighDiversity,
          recommendedAction: "continue", // Would be determined by sentinel
        },
      };
    } catch (error) {
      this.logger.warn("Sentinel analysis failed", error);
      return {
        biasDetected: false,
        diversityScore: 0,
        qualityScore: 0,
        recommendations: ["Sentinel analysis unavailable"],
        analysis: { error: String(error) },
      };
    }
  }

  private buildAgentPerformanceMap(
    outputs: AgentOutput[]
  ): Record<string, import("../types/agent-output").AgentPerformanceMetrics> {
    const performance: Record<
      string,
      import("../types/agent-output").AgentPerformanceMetrics
    > = {};

    for (const output of outputs) {
      if (output.statistics) {
        performance[output.agentId] = output.statistics;
      } else {
        // Create basic performance metrics
        performance[output.agentId] = {
          totalEvaluations: 1,
          averageEvaluationTime: output.processing?.processingTime || 0,
          averageConfidence: output.evaluation.confidence,
          successRate: output.error?.hasError ? 0 : 1,
          contributionScore: output.evaluation.confidence,
        };
      }
    }

    return performance;
  }

  private generateRecommendation(
    multiAgentOutput: MultiAgentOutput,
    _sentinelAnalysis?: EngineOutput["sentinelAnalysis"],
    actions?: Action[]
  ): EngineOutput["recommendation"] {
    const successfulOutputs = multiAgentOutput.agentOutputs.filter(
      (output) => !output.error?.hasError
    );

    if (successfulOutputs.length === 0) {
      return undefined;
    }

    // Find highest confidence output
    const bestOutput = successfulOutputs.reduce((best, current) =>
      current.evaluation.confidence > best.evaluation.confidence
        ? current
        : best
    );

    // If actions are provided and the best output has an action recommendation
    if (actions && actions.length > 0) {
      // For now, return the first action as a placeholder
      // In a full implementation, this would be more sophisticated
      return {
        action: actions[0],
        confidence: bestOutput.evaluation.confidence,
        reasoning:
          bestOutput.evaluation.reasoning ||
          "Best available option based on agent analysis",
        contributors: [bestOutput.agentId],
      };
    }

    return undefined;
  }

  private estimateMemoryUsage(): number {
    // Simple memory estimation
    // In a full implementation, this would be more accurate
    return this.agents.size * 1024 * 1024; // 1MB per agent estimate
  }
}
