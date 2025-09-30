/**
 * Base agent interface and implementation for the POLARIS framework
 */

import { Identifiable, Cloneable } from '../../types/common';
import { EvaluationResult } from '../../types/evaluation';
import { GameState } from '../../domains/base/game-state';
import { Action } from '../../domains/base/action';
import { AgentParameters, AgentStatistics } from './parameters';

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
  
  /** Evaluate a game state and return a score with confidence */
  evaluate(state: GameState): Promise<EvaluationResult>;
  
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
  
  protected statistics: AgentStatistics;
  protected initialized: boolean = false;
  protected ready: boolean = true;

  protected constructor(id: string, name: string, type: string, parameters: AgentParameters) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.parameters = { ...parameters };
    
    this.statistics = {
      agentId: this.id,
      totalEvaluations: 0,
      averageEvaluationTime: 0,
      averageConfidence: 0,
      selectionCount: 0,
      performanceScore: 0,
      totalThinkingTime: 0,
      errorCount: 0
    };
  }

  // Abstract methods that must be implemented
  abstract evaluate(state: GameState): Promise<EvaluationResult>;
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
      errorCount: 0
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
      ready: this.ready
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
   * Update statistics after an evaluation
   */
  protected updateStatistics(evaluation: EvaluationResult): void {
    this.statistics.totalEvaluations++;
    this.statistics.selectionCount++;
    
    if (evaluation.evaluationTime !== undefined) {
      const totalTime = this.statistics.averageEvaluationTime * (this.statistics.totalEvaluations - 1) + evaluation.evaluationTime;
      this.statistics.averageEvaluationTime = totalTime / this.statistics.totalEvaluations;
      this.statistics.totalThinkingTime += evaluation.evaluationTime;
    }
    
    const totalConfidence = this.statistics.averageConfidence * (this.statistics.totalEvaluations - 1) + evaluation.confidence;
    this.statistics.averageConfidence = totalConfidence / this.statistics.totalEvaluations;
    
    this.statistics.lastEvaluationTime = Date.now();
  }

  /**
   * Handle errors and update error statistics
   */
  protected handleError(error: Error): void {
    this.statistics.errorCount++;
    console.error(`Error in agent ${this.name}:`, error);
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
      typeof evaluation.score === 'number' &&
      typeof evaluation.confidence === 'number' &&
      evaluation.confidence >= 0 &&
      evaluation.confidence <= 1 &&
      !isNaN(evaluation.score) &&
      !isNaN(evaluation.confidence)
    );
  }

  /**
   * Apply temperature to scores for randomization
   */
  protected applyTemperature(scores: number[], temperature: number = 0.1): number[] {
    if (temperature === 0) return scores;
    
    const maxScore = Math.max(...scores);
    const expScores = scores.map(score => Math.exp((score - maxScore) / temperature));
    const sumExp = expScores.reduce((sum, exp) => sum + exp, 0);
    
    return expScores.map(exp => exp / sumExp);
  }
}