/**
 * Agent parameter types and interfaces
 */

import { Weight, Confidence } from '../../types/common';

/**
 * Base parameters that all agents can have
 */
export interface AgentParameters {
  /** Temperature for randomness/exploration (0-1) */
  temperature?: number;
  
  /** Bias type for the agent's decision making */
  bias?: AgentBias;
  
  /** Maximum thinking time in milliseconds */
  maxThinkingTime?: number;
  
  /** Random seed for reproducibility */
  randomSeed?: number;
  
  /** Weight for this agent's contributions */
  weight?: Weight;
  
  /** Minimum confidence threshold */
  confidenceThreshold?: Confidence;
  
  /** Additional agent-specific parameters */
  [key: string]: any;
}

/**
 * Types of bias an agent can have
 */
export enum AgentBias {
  AGGRESSIVE = 'aggressive',
  CONSERVATIVE = 'conservative',
  BALANCED = 'balanced',
  EXPLORATORY = 'exploratory',
  EXPLOITATIVE = 'exploitative'
}

/**
 * Statistics tracked for each agent
 */
export interface AgentStatistics {
  /** Unique identifier for the agent */
  agentId: string;
  
  /** Total number of evaluations performed */
  totalEvaluations: number;
  
  /** Average evaluation time in milliseconds */
  averageEvaluationTime: number;
  
  /** Average confidence score */
  averageConfidence: Confidence;
  
  /** Number of times this agent was selected */
  selectionCount: number;
  
  /** Performance score (based on accuracy/usefulness) */
  performanceScore: number;
  
  /** Total thinking time used */
  totalThinkingTime: number;
  
  /** Number of timeouts or errors */
  errorCount: number;
  
  /** Last evaluation timestamp */
  lastEvaluationTime?: number;
  
  /** Agent-specific statistics */
  customStats?: Record<string, any>;
}

/**
 * Configuration for web API agents
 */
export interface WebAPIConfig extends AgentParameters {
  /** API provider */
  provider: 'openai' | 'anthropic' | 'google' | 'custom';
  
  /** API key for authentication */
  apiKey: string;
  
  /** Model name/identifier */
  model: string;
  
  /** Base URL for API (if custom) */
  baseURL?: string;
  
  /** Rate limiting configuration */
  rateLimiting?: RateLimitConfig;
  
  /** Request timeout in milliseconds */
  timeout?: number;
  
  /** Maximum tokens in response */
  maxTokens?: number;
  
  /** System prompt template */
  systemPrompt?: string;
}

/**
 * Rate limiting configuration for API agents
 */
export interface RateLimitConfig {
  /** Maximum requests per minute */
  requestsPerMinute: number;
  
  /** Maximum tokens per minute */
  tokensPerMinute?: number;
  
  /** Delay between retries in milliseconds */
  retryDelay: number;
  
  /** Maximum number of retries */
  maxRetries: number;
  
  /** Exponential backoff multiplier */
  backoffMultiplier?: number;
}

/**
 * Configuration for heuristic agents
 */
export interface HeuristicConfig extends AgentParameters {
  /** Maximum search depth */
  maxDepth: number;
  
  /** Use transposition table */
  useTranspositionTable?: boolean;
  
  /** Evaluation function parameters */
  evaluationParams?: Record<string, number>;
  
  /** Time limit per move in milliseconds */
  moveTimeLimit?: number;
}