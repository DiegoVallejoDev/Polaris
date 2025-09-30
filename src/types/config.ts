/**
 * Configuration types for the POLARIS framework
 */

import { SearchConfig } from './search';
import { Weight } from './common';

/**
 * Main configuration for the POLARIS engine
 */
export interface PolarisConfig {
  /** List of agents to use in the search */
  agents: AgentConfig[];
  
  /** Configuration for the sentinel agent */
  sentinel: SentinelConfig;
  
  /** Search algorithm configuration */
  search: SearchConfig;
  
  /** Domain-specific configuration */
  domain?: DomainConfig;
  
  /** Logging configuration */
  logging?: LoggingConfig;
  
  /** Performance monitoring configuration */
  monitoring?: MonitoringConfig;
}

/**
 * Configuration for individual agents
 */
export interface AgentConfig {
  /** Type identifier for the agent */
  type: string;
  
  /** Agent-specific parameters */
  parameters: AgentParameters;
  
  /** Weight/importance of this agent in evaluations */
  weight?: Weight;
  
  /** Whether this agent is enabled */
  enabled: boolean;
  
  /** Optional name for the agent */
  name?: string;
  
  /** Maximum thinking time for the agent */
  maxThinkingTime?: number;
}

/**
 * Base parameters that all agents can have
 */
export interface AgentParameters {
  /** Temperature for randomness (0-1) */
  temperature?: number;
  
  /** Bias type for the agent */
  bias?: 'aggressive' | 'conservative' | 'balanced';
  
  /** Maximum thinking time in milliseconds */
  maxThinkingTime?: number;
  
  /** Random seed for reproducibility */
  randomSeed?: number;
  
  /** Additional agent-specific parameters */
  [key: string]: any;
}

/**
 * Configuration for the Sentinel agent
 */
export interface SentinelConfig {
  /** Threshold for diversity detection (0-1) */
  diversityThreshold: number;
  
  /** Enable bias detection */
  biasDetectionEnabled: boolean;
  
  /** Strength of score corrections (0-1) */
  correctionStrength: number;
  
  /** Depth of analysis to perform */
  analysisDepth: number;
  
  /** Enable adaptive learning */
  learningEnabled?: boolean;
  
  /** Confidence threshold for interventions */
  interventionThreshold?: number;
  
  /** Maximum correction per evaluation */
  maxCorrection?: number;
}

/**
 * Domain-specific configuration
 */
export interface DomainConfig {
  /** Name of the domain */
  name: string;
  
  /** Class name for the state implementation */
  stateClass: string;
  
  /** Class name for the action implementation */
  actionClass: string;
  
  /** Domain-specific rules and parameters */
  rules?: Record<string, any>;
  
  /** Feature extraction configuration */
  features?: FeatureConfig;
}

/**
 * Configuration for feature extraction
 */
export interface FeatureConfig {
  /** List of feature extractors to use */
  extractors: string[];
  
  /** Feature normalization settings */
  normalization?: NormalizationConfig;
  
  /** Feature selection settings */
  selection?: FeatureSelectionConfig;
}

/**
 * Configuration for feature normalization
 */
export interface NormalizationConfig {
  /** Type of normalization */
  type: 'minmax' | 'zscore' | 'none';
  
  /** Parameters for normalization */
  parameters?: Record<string, number>;
}

/**
 * Configuration for feature selection
 */
export interface FeatureSelectionConfig {
  /** Maximum number of features to select */
  maxFeatures?: number;
  
  /** Feature selection method */
  method: 'variance' | 'correlation' | 'mutual_info' | 'none';
  
  /** Threshold for feature selection */
  threshold?: number;
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  /** Logging level */
  level: 'debug' | 'info' | 'warn' | 'error';
  
  /** Whether to log to console */
  console: boolean;
  
  /** Whether to log to file */
  file?: string;
  
  /** Whether to log search statistics */
  statistics: boolean;
  
  /** Whether to log agent evaluations */
  evaluations: boolean;
}

/**
 * Performance monitoring configuration
 */
export interface MonitoringConfig {
  /** Enable performance monitoring */
  enabled: boolean;
  
  /** Sample rate for monitoring (0-1) */
  sampleRate: number;
  
  /** Metrics to collect */
  metrics: string[];
  
  /** Export configuration for metrics */
  export?: MetricsExportConfig;
}

/**
 * Configuration for metrics export
 */
export interface MetricsExportConfig {
  /** Export format */
  format: 'json' | 'csv' | 'prometheus';
  
  /** Export destination */
  destination: string;
  
  /** Export interval in milliseconds */
  interval: number;
}