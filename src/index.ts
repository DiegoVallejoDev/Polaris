/**
 * Main exports for the POLARIS framework
 */

// Core engine and tree
export { TreeNode, NodeStatistics } from "./core/node";
export { MCTSTree, TreeStatistics } from "./core/tree";
export {
  SearchAlgorithm,
  AgentSelector,
  SelectionStrategy,
  AgentStats,
} from "./core/search";

// Agent system
export { Agent, BaseAgent } from "./agents/base/agent";
export {
  AgentParameters,
  AgentStatistics,
  AgentBias,
  WebAPIConfig,
  HeuristicConfig,
} from "./agents/base/parameters";

// Domain system
export { GameState, BaseGameState } from "./domains/base/game-state";
export { Action, BaseAction } from "./domains/base/action";
export {
  GameResult,
  GameEndReason,
  MoveResult,
  PositionAnalysis,
} from "./domains/base/result";

// Types
export * from "./types/common";
export * from "./types/evaluation";
export * from "./types/search";
export * from "./types/config";

// Sentinel system
export {
  SentinelAgent,
  SentinelEvaluation,
  SentinelAnalysisContext,
  SentinelStatistics,
} from "./sentinel/sentinel";
export {
  BiasDetector,
  BiasReport,
  BiasType,
  BiasDetectionConfig,
} from "./sentinel/bias-detector";
export {
  DiversityAnalyzer,
  DiversityAnalysis,
  DiversityConfig,
} from "./sentinel/diversity-analyzer";

// Utilities
export { MathUtils, RandomUtils } from "./utils/math";
export { Logger, LogLevel, PerformanceLogger, logger } from "./utils/logger";
export {
  EnvironmentConfig,
  getEnvVar,
  getEnvVarAsNumber,
  getEnvVarAsBoolean,
} from "./utils/config";

// Enhanced utilities
export { Result, Ok, Err, ok, err, tryCatch, tryAsync } from "./utils/result";
export {
  Validator,
  EvaluationValidator,
  ConfigValidator,
  ValidationBuilder,
  validate,
} from "./utils/validation";
export {
  EnhancedEnvironmentConfig,
  ConfigBuilder,
  createConfigBuilder,
  configRegistry,
} from "./utils/enhanced-config";
export {
  StatisticsManager,
  statisticsManager,
  withStatistics,
} from "./utils/statistics";
export {
  AgentFactory,
  AgentFactoryManager,
  agentFactory,
  createAgent,
  createAgents,
  AgentType,
  ValidationLevel,
} from "./utils/agent-factory";

// Errors
export * from "./errors/base";

// Framework version
export const VERSION = "0.1.0";

/**
 * Framework information
 */
export const POLARIS_INFO = {
  name: "POLARIS",
  fullName:
    "Policy Optimization via Layered Agents and Recursive Inference Search",
  version: VERSION,
  description:
    "A novel decision-making framework with agent-agnostic MCTS and Sentinel Agent oversight",
  author: "Diego Vallejo",
  license: "MIT",
} as const;
