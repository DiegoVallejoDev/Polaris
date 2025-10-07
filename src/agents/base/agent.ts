/**
 * Base agent interface and implementation for the POLARIS framework
 */

import { Identifiable, Cloneable } from "../../types/common";
import { EvaluationResult } from "../../types/evaluation";
import { GameState } from "../../domains/base/game-state";
import { Action } from "../../domains/base/action";
import { AgentParameters, AgentStatistics } from "./parameters";
import {
  AgentOutput,
  AgentOutputFactory,
  AgentPerformanceMetrics,
} from "../../types/agent-output";
import { PolarisEngineTask, AgentRole, DomainConfig } from "../../types/task";

/**
 * Core interface that all agents must implement
 */
export interface Agent extends Identifiable, Cloneable<Agent> {
  /** Human-readable name for the agent */
  readonly name: string;

  /** Agent configuration parameters */
  readonly parameters: AgentParameters;

  /** Type identifier for this agent */
  readonly type: string;

  /** Role this agent is playing */
  readonly role: AgentRole;

  /** Task context this agent is operating in */
  readonly task: PolarisEngineTask;

  /** Domain configuration for this agent */
  readonly domain: DomainConfig;

  /** Evaluate a game state and return unified agent output */
  evaluate(state: GameState, actions?: Action[]): Promise<AgentOutput>;

  /** Legacy evaluation method (for backwards compatibility) */
  evaluateLegacy?(state: GameState): Promise<EvaluationResult>;

  /** Select the best action from available options */
  selectAction(state: GameState, actions: Action[]): Promise<Action>;

  /** Initialize the agent (optional setup) */
  initialize?(): Promise<void>;

  /** Clean up resources (optional cleanup) */
  cleanup?(): Promise<void>;

  /** Get current performance statistics */
  getStatistics(): AgentStatistics;

  /** Reset all statistics */
  resetStatistics(): void;

  /** Check if agent is currently available/ready */
  isReady(): boolean;

  /** Get agent metadata */
  getMetadata(): Record<string, any>;
}

/**
 * Abstract base implementation providing common functionality
 */
export abstract class BaseAgent implements Agent {
  public readonly id: string;
  public readonly name: string;
  public readonly parameters: AgentParameters;
  public readonly type: string;
  public readonly role: AgentRole;
  public readonly task: PolarisEngineTask;
  public readonly domain: DomainConfig;

  protected statistics: AgentStatistics;
  protected initialized: boolean = false;
  protected ready: boolean = true;

  protected constructor(params: {
    id: string;
    name: string;
    type: string;
    role: AgentRole;
    task: PolarisEngineTask;
    parameters: AgentParameters;
  }) {
    this.id = params.id;
    this.name = params.name;
    this.type = params.type;
    this.role = params.role;
    this.task = params.task;
    this.domain = params.task.domain;
    this.parameters = { ...params.parameters };

    this.statistics = {
      agentId: this.id,
      totalEvaluations: 0,
      averageEvaluationTime: 0,
      averageConfidence: 0,
      selectionCount: 0,
      performanceScore: 0,
      totalThinkingTime: 0,
      errorCount: 0,
    };
  }

  // Abstract methods that must be implemented
  abstract evaluate(state: GameState, actions?: Action[]): Promise<AgentOutput>;
  abstract selectAction(state: GameState, actions: Action[]): Promise<Action>;
  abstract clone(): Agent;

  // Common implementations
  getStatistics(): AgentStatistics {
    return { ...this.statistics };
  }

  resetStatistics(): void {
    this.statistics = {
      agentId: this.id,
      totalEvaluations: 0,
      averageEvaluationTime: 0,
      averageConfidence: 0,
      selectionCount: 0,
      performanceScore: 0,
      totalThinkingTime: 0,
      errorCount: 0,
    };
  }

  isReady(): boolean {
    return this.ready && this.initialized;
  }

  getMetadata(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      parameters: this.parameters,
      statistics: this.statistics,
      initialized: this.initialized,
      ready: this.ready,
    };
  }

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async cleanup(): Promise<void> {
    this.ready = false;
  }

  toString(): string {
    return `${this.type}Agent(${this.name})`;
  }

  /**
   * Build a prompt using the role, task, and domain
   */
  protected buildPrompt(state: GameState, actions?: Action[]): string {
    const stateData = state.serialize();
    const actionsData = actions
      ? actions.map((action) => action.toString())
      : [];

    return `
Task: ${this.task.name}
Description: ${this.task.description}

Domain: ${this.domain.name}
Domain Description: ${this.domain.description}
Domain Rules: ${JSON.stringify(this.domain.rules, null, 2)}

Your Role: ${this.role.name}
Role Goal: ${this.role.goal}
Role Instructions: ${this.role.instructions}
${this.role.perspective ? `Role Perspective: ${this.role.perspective}` : ""}

Current Game State:
- State ID: ${state.id}
- Current Player: ${state.currentPlayer}
- Turn Number: ${state.getTurnNumber()}
- Is Terminal: ${state.isTerminal}
- State Data: ${JSON.stringify(stateData, null, 2)}

${
  actions && actions.length > 0
    ? `Available Actions:
${actionsData.map((action, index) => `${index + 1}. ${action}`).join("\n")}`
    : ""
}

Task Goals:
- Primary: ${this.task.goals.primary}
${this.task.goals.secondary ? `- Secondary: ${this.task.goals.secondary.join(", ")}` : ""}

Please analyze this situation from your role's perspective and provide your evaluation in the following JSON format:
{
  "score": <number between 0 and 1, where 0.5 is neutral>,
  "confidence": <number between 0 and 1 indicating certainty>,
  "reasoning": "<detailed explanation of your evaluation from your role's perspective>",
  "keyFactors": ["<factor1>", "<factor2>", ...],
  "recommendedActions": ["<action1>", "<action2>", ...],
  "roleSpecificInsights": "<insights specific to your role>",
  "riskAssessment": "<low/medium/high>",
  "metadata": {
    "roleAlignment": "<how well this aligns with your role's goals>",
    "domainSpecificFactors": ["<factor1>", "<factor2>", ...],
    "taskRelevance": "<how relevant this is to the overall task>"
  }
}

Focus on your role as ${this.role.name}: ${this.role.goal}
${this.role.instructions}

Provide your response as valid JSON only.
`;
  }

  /**
   * Update statistics after an evaluation
   */
  protected updateStatistics(evaluation: EvaluationResult): void {
    this.statistics.totalEvaluations++;
    this.statistics.selectionCount++;

    if (evaluation.evaluationTime !== undefined) {
      const totalTime =
        this.statistics.averageEvaluationTime *
          (this.statistics.totalEvaluations - 1) +
        evaluation.evaluationTime;
      this.statistics.averageEvaluationTime =
        totalTime / this.statistics.totalEvaluations;
      this.statistics.totalThinkingTime += evaluation.evaluationTime;
    }

    const totalConfidence =
      this.statistics.averageConfidence *
        (this.statistics.totalEvaluations - 1) +
      evaluation.confidence;
    this.statistics.averageConfidence =
      totalConfidence / this.statistics.totalEvaluations;

    this.statistics.lastEvaluationTime = Date.now();
  }

  /**
   * Update statistics from agent output
   */
  protected updateStatisticsFromOutput(output: AgentOutput): void {
    this.statistics.totalEvaluations++;
    this.statistics.selectionCount++;

    if (output.processing?.processingTime !== undefined) {
      const totalTime =
        this.statistics.averageEvaluationTime *
          (this.statistics.totalEvaluations - 1) +
        output.processing.processingTime;
      this.statistics.averageEvaluationTime =
        totalTime / this.statistics.totalEvaluations;
      this.statistics.totalThinkingTime += output.processing.processingTime;
    }

    const totalConfidence =
      this.statistics.averageConfidence *
        (this.statistics.totalEvaluations - 1) +
      output.evaluation.confidence;
    this.statistics.averageConfidence =
      totalConfidence / this.statistics.totalEvaluations;

    this.statistics.lastEvaluationTime = Date.now();

    if (output.error?.hasError) {
      this.statistics.errorCount++;
    }
  }

  /**
   * Handle errors and update error statistics
   */
  protected handleError(error: Error): void {
    this.statistics.errorCount++;
    console.error(`Error in agent ${this.name}:`, error);
  }

  /**
   * Legacy evaluation method for backwards compatibility
   */
  async evaluateLegacy(state: GameState): Promise<EvaluationResult> {
    const output = await this.evaluate(state);
    return output.evaluation;
  }

  /**
   * Create agent output from evaluation result
   */
  protected createAgentOutput(
    evaluation: EvaluationResult,
    processingTime: number,
    model?: string,
    tokensUsed?: number,
    error?: { hasError: boolean; message?: string; type?: string }
  ): AgentOutput {
    const processing: AgentOutput["processing"] = {
      processingTime,
      metadata: {
        roleId: this.role.id,
        domainId: this.domain.id,
      },
    };

    if (model !== undefined) processing.model = model;
    if (tokensUsed !== undefined) processing.tokensUsed = tokensUsed;

    return AgentOutputFactory.create({
      agentId: this.id,
      agentName: this.name,
      providerType: this.type,
      evaluation,
      role: this.role.id,
      taskContext: {
        taskId: this.task.id,
        taskName: this.task.name,
        domainId: this.domain.id,
      },
      processing,
      error,
      statistics: this.convertToPerformanceMetrics(),
    });
  }

  /**
   * Convert agent statistics to performance metrics
   */
  protected convertToPerformanceMetrics(): AgentPerformanceMetrics {
    return {
      totalEvaluations: this.statistics.totalEvaluations,
      averageEvaluationTime: this.statistics.averageEvaluationTime,
      averageConfidence: this.statistics.averageConfidence,
      successRate:
        this.statistics.errorCount === 0
          ? 1.0
          : (this.statistics.totalEvaluations - this.statistics.errorCount) /
            this.statistics.totalEvaluations,
      contributionScore: this.statistics.performanceScore,
      errorCount: this.statistics.errorCount,
    };
  }

  /**
   * Generate a unique agent ID
   */
  protected static generateAgentId(type: string): string {
    return `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate evaluation result
   */
  protected validateEvaluation(evaluation: EvaluationResult): boolean {
    return (
      typeof evaluation.score === "number" &&
      typeof evaluation.confidence === "number" &&
      evaluation.confidence >= 0 &&
      evaluation.confidence <= 1 &&
      !isNaN(evaluation.score) &&
      !isNaN(evaluation.confidence)
    );
  }

  /**
   * Apply temperature to scores for randomization
   */
  protected applyTemperature(
    scores: number[],
    temperature: number = 0.1
  ): number[] {
    if (temperature === 0) return scores;

    const maxScore = Math.max(...scores);
    const expScores = scores.map((score) =>
      Math.exp((score - maxScore) / temperature)
    );
    const sumExp = expScores.reduce((sum, exp) => sum + exp, 0);

    return expScores.map((exp) => exp / sumExp);
  }
}
