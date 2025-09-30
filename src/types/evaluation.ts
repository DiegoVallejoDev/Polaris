/**
 * Evaluation result types and interfaces for agent assessments
 */

import { Score, Confidence, Timestamp } from './common';

/**
 * Result of an agent's evaluation of a game state
 */
export interface EvaluationResult {
  /** Numerical score representing the evaluation */
  score: Score;
  
  /** Confidence level in the evaluation (0-1) */
  confidence: Confidence;
  
  /** Optional reasoning or explanation for the evaluation */
  reasoning?: string;
  
  /** Additional metadata about the evaluation */
  metadata?: Record<string, any>;
  
  /** Time taken to compute this evaluation in milliseconds */
  evaluationTime?: number;
  
  /** Feature vector used in the evaluation */
  features?: number[];
  
  /** Timestamp when evaluation was performed */
  timestamp?: Timestamp;
  
  /** ID of the agent that performed this evaluation */
  agentId?: string;
}

/**
 * Aggregated evaluation from multiple agents
 */
export interface AggregatedEvaluation {
  /** Combined score from all evaluations */
  combinedScore: Score;
  
  /** Overall confidence in the aggregated result */
  confidence: Confidence;
  
  /** Individual evaluations that were aggregated */
  individualEvaluations: EvaluationResult[];
  
  /** Method used for aggregation */
  aggregationMethod: AggregationMethod;
  
  /** Diversity score of the evaluations */
  diversityScore: number;
  
  /** Whether bias was detected in the evaluations */
  biasDetected: boolean;
}

/**
 * Methods for aggregating multiple evaluations
 */
export enum AggregationMethod {
  AVERAGE = 'average',
  WEIGHTED_AVERAGE = 'weighted_average',
  MEDIAN = 'median',
  MAX = 'max',
  MIN = 'min',
  CONSENSUS = 'consensus',
  SENTINEL_ADJUSTED = 'sentinel_adjusted'
}

/**
 * Context information for evaluations
 */
export interface EvaluationContext {
  /** Current game state being evaluated */
  stateId: string;
  
  /** Depth in the search tree */
  depth: number;
  
  /** Available actions from this state */
  availableActions: string[];
  
  /** History of previous evaluations */
  evaluationHistory: EvaluationResult[];
  
  /** Time constraints for evaluation */
  timeLimit?: number;
  
  /** Additional context data */
  contextData?: Record<string, any>;
}