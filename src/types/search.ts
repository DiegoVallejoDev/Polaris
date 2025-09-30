/**
 * Search result types and interfaces for MCTS operations
 */

import { Score, Confidence, Timestamp } from './common';
import { EvaluationResult } from './evaluation';

/**
 * Result of a search operation
 */
export interface SearchResult {
  /** The best action found by the search */
  bestAction: any; // Will be typed more specifically in domain implementations
  
  /** Score of the best action */
  bestScore: Score;
  
  /** Confidence in the search result */
  confidence: Confidence;
  
  /** Detailed statistics about the search */
  statistics: SearchStatistics;
  
  /** Optional reference to the search tree */
  tree?: any; // MCTSTree reference
  
  /** All evaluations performed during search */
  evaluations: EvaluationResult[];
  
  /** Principal variation (best line of play) */
  principalVariation?: any[];
  
  /** Time when search was completed */
  completedAt: Timestamp;
}

/**
 * Statistics collected during search
 */
export interface SearchStatistics {
  /** Total number of nodes explored */
  nodesExplored: number;
  
  /** Total number of simulations performed */
  totalSimulations: number;
  
  /** Total time spent searching in milliseconds */
  searchTime: number;
  
  /** Average depth of explored nodes */
  averageDepth: number;
  
  /** Maximum depth reached */
  maxDepth: number;
  
  /** Usage count for each agent */
  agentUsage: Map<string, number>;
  
  /** Number of sentinel interventions */
  sentinelInterventions: number;
  
  /** Nodes evaluated per second */
  nodesPerSecond: number;
  
  /** Memory usage in bytes */
  memoryUsage?: number;
  
  /** Breakdown of time spent in each phase */
  phaseTimings: PhaseTimings;
}

/**
 * Time breakdown for different search phases
 */
export interface PhaseTimings {
  /** Time spent in selection phase */
  selection: number;
  
  /** Time spent in expansion phase */
  expansion: number;
  
  /** Time spent in simulation/evaluation phase */
  simulation: number;
  
  /** Time spent in backpropagation phase */
  backpropagation: number;
  
  /** Time spent in sentinel analysis */
  sentinelAnalysis: number;
}

/**
 * Configuration for search operations
 */
export interface SearchConfig {
  /** Maximum depth to search */
  maxDepth: number;
  
  /** Number of simulations per node */
  simulationsPerNode: number;
  
  /** Time limit for search in milliseconds */
  timeLimit?: number;
  
  /** UCB1 exploration constant */
  explorationConstant: number;
  
  /** Number of parallel search threads */
  parallelism: number;
  
  /** Memory limit for search tree */
  memoryLimit?: string;
  
  /** Enable/disable progressive widening */
  progressiveWidening: boolean;
  
  /** Early termination conditions */
  earlyTermination?: EarlyTerminationConfig;
}

/**
 * Configuration for early search termination
 */
export interface EarlyTerminationConfig {
  /** Stop if confidence exceeds this threshold */
  confidenceThreshold?: number;
  
  /** Stop if score difference exceeds this threshold */
  scoreDifference?: number;
  
  /** Minimum number of simulations before early termination */
  minSimulations: number;
}