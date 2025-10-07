/**
 * Main exports for the POLARIS framework
 * Unified interface following the refactoring plan
 */

// ===== PRIMARY EXPORTS - New Unified Interface =====

// Main Engine
export { PolarisEngine } from "./engine/polaris-engine";
export type {
  PolarisEngineConfig,
  InferenceParams,
} from "./engine/polaris-engine";

// Task and Role System
export {
  PolarisEngineTask,
  AgentRole,
  DomainConfig,
  CommonRoles,
  CommonDomains,
  TaskBuilder,
} from "./types/task";

// Agent Output System
export {
  AgentOutput,
  AgentOutputFactory,
  AgentOutputUtils,
  MultiAgentOutput,
  EngineOutput,
  AgentPerformanceMetrics,
  ActionResult,
} from "./types/agent-output";

// Agent Factory System - Ergonomic Agent Creation
export {
  openAiAgent,
  anthropicAgent,
  googleAgent,
  createAgent,
  createAgents,
  createEnsemble,
  QuickAgents,
  AgentEnsembleBuilder,
  AgentProvider,
} from "./agents/factories/agent-factory";
export type {
  AgentFactoryConfig,
  BulkAgentConfig,
} from "./agents/factories/agent-factory";

// Configuration Presets
export {
  ConfigurationPresets,
  Presets,
  PresetCategories,
  PresetLoader,
  presets,
} from "./config";
export type { EnginePreset } from "./config";

// Agent System (Refactored)
export { Agent, BaseAgent } from "./agents/base/agent";
export { OpenAIAgent } from "./agents/web/openai-agent";
export { AnthropicAgent } from "./agents/web/anthropic-agent";
export { GoogleAgent } from "./agents/web/google-agent";
export type { OpenAIAgentConfig } from "./agents/web/openai-agent";
export type { AnthropicAgentConfig } from "./agents/web/anthropic-agent";
export type { GoogleAgentConfig } from "./agents/web/google-agent";

// ===== LEGACY EXPORTS - For Backwards Compatibility =====

// Note: Legacy core engine files have been removed in favor of the new PolarisEngine
// If you need the old MCTS tree functionality, please use the new unified engine

// Agent parameters (legacy)
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

// Philosophy domain
export * from "./domains/philosophy";

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
// Legacy agent factory has been removed - use the new ergonomic factories above

// Errors
export * from "./errors/base";

// ===== FRAMEWORK METADATA =====

// Framework version
export const VERSION = "1.0.0"; // Production release with unified API

/**
 * Framework information
 */
export const POLARIS_INFO = {
  name: "POLARIS",
  fullName:
    "Policy Optimization via Layered Agents and Recursive Inference Search",
  version: VERSION,
  description:
    "A unified decision-making framework with role-aware agents, task templates, and ergonomic configuration",
  author: "Diego Vallejo",
  license: "MIT",
  repository: "https://github.com/DiegoVallejoDev/Polaris",
  features: [
    "Role-aware agents with task context",
    "Unified agent output format",
    "Ergonomic agent creation",
    "Configuration presets",
    "Multi-provider support (OpenAI, Anthropic, Google)",
    "Sentinel agent oversight",
    "Backwards compatibility",
    "90% less boilerplate code",
    "Quick start helpers",
  ],
  changelog: {
    v1_0_0: [
      "Production release with unified API",
      "90% code reduction through ergonomic design",
      "Role-aware agents with automatic prompt building",
      "TaskBuilder for ergonomic task creation",
      "Agent factory functions for all providers",
      "Configuration presets for common use cases",
      "PolarisEngine unified inference engine",
      "QuickStart one-line setup",
      "Comprehensive examples and documentation",
      "Full TypeScript support with strict mode",
    ],
  },
  releaseDate: "2025-10-07",
  stability: "stable",
} as const;

// ===== QUICK START HELPERS =====

/**
 * Quick start function for common use cases
 */
export function quickStart(
  useCase: "chess" | "debate" | "decision" | "general" = "general"
) {
  // Import the required modules directly
  const { PresetLoader } = require("./config/presets");
  const { PolarisEngine } = require("./engine/polaris-engine");
  const { createAgent } = require("./agents/factories/agent-factory");

  const recommendedPresets = PresetLoader.getRecommendations(useCase);
  const preset =
    recommendedPresets[0] || PresetLoader.getPreset("quick-start")!;

  return {
    preset,
    createEngine: (apiKeys?: {
      openai?: string;
      anthropic?: string;
      google?: string;
    }) => {
      const agents = preset.agents.map((agentConfig: any) => {
        const role = preset.task.roles[agentConfig.roleId];
        const config = {
          role,
          task: preset.task,
          model: agentConfig.model,
          name: agentConfig.name,
          maxTokens: agentConfig.maxTokens,
          temperature: agentConfig.temperature,
          apiKey: apiKeys?.[agentConfig.provider as keyof typeof apiKeys],
        };

        return createAgent(agentConfig.provider, config);
      });

      return new PolarisEngine({
        task: preset.task,
        agents,
        engineConfig: preset.engineConfig,
      });
    },
  };
}
