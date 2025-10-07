/**
 * Unified agent output types for standardized agent responses
 */

import { EvaluationResult } from "./evaluation";
import { Action } from "../domains/base/action";

/**
 * Performance metrics for agent evaluation
 */
export interface AgentPerformanceMetrics {
  /** Total number of evaluations performed */
  totalEvaluations: number;

  /** Average evaluation time in milliseconds */
  averageEvaluationTime: number;

  /** Average confidence score */
  averageConfidence: number;

  /** Success rate (successful evaluations / total evaluations) */
  successRate: number;

  /** Contribution score to overall decision making */
  contributionScore: number;

  /** Number of errors encountered */
  errorCount?: number;

  /** Additional custom metrics */
  customMetrics?: Record<string, number>;
}

/**
 * Action result with reasoning and confidence
 */
export interface ActionResult {
  /** Recommended action */
  action: Action;

  /** Reasoning for the action selection */
  reason: string;

  /** Confidence in the action (0-1) */
  confidence: number;

  /** Alternative actions considered */
  alternatives?: Action[];

  /** Additional action metadata */
  metadata?: Record<string, any>;
}

/**
 * Unified output object for all agents
 */
export interface AgentOutput {
  /** Evaluation result from the agent */
  evaluation: EvaluationResult;

  /** Optional action recommendation */
  action?: ActionResult;

  /** Optional agent performance statistics */
  statistics?: AgentPerformanceMetrics;

  /** ID of the agent that produced this output */
  agentId: string;

  /** Name of the agent that produced this output */
  agentName: string;

  /** Provider type (openai, anthropic, google, heuristic, etc.) */
  providerType: string;

  /** Timestamp when output was generated */
  timestamp: string;

  /** Role the agent was playing when generating this output */
  role?: string;

  /** Task context information */
  taskContext?: {
    taskId: string;
    taskName: string;
    domainId: string;
  };

  /** Processing information */
  processing?: {
    /** Time taken to generate this output (ms) */
    processingTime: number;

    /** Model or method used */
    model?: string;

    /** Tokens used (for LLM agents) */
    tokensUsed?: number;

    /** Additional processing metadata */
    metadata?: Record<string, any>;
  };

  /** Error information if processing failed */
  error?: {
    /** Whether an error occurred */
    hasError: boolean;

    /** Error message */
    message?: string;

    /** Error type/code */
    type?: string;

    /** Whether this is a fallback response */
    isFallback?: boolean;
  };

  /** Additional agent-specific metadata */
  metadata?: Record<string, any>;
}

/**
 * Collection of outputs from multiple agents
 */
export interface MultiAgentOutput {
  /** Individual agent outputs */
  agentOutputs: AgentOutput[];

  /** Aggregated evaluation if computed */
  aggregatedEvaluation?: EvaluationResult;

  /** Consensus action if reached */
  consensusAction?: ActionResult;

  /** Diversity metrics */
  diversity?: {
    /** Score diversity (standard deviation) */
    scoreVariance: number;

    /** Opinion diversity measure */
    opinionDivergence: number;

    /** Approach diversity */
    approachDiversity: number;
  };

  /** Processing summary */
  summary: {
    /** Total agents that participated */
    totalAgents: number;

    /** Agents that completed successfully */
    successfulAgents: number;

    /** Agents that failed */
    failedAgents: number;

    /** Total processing time */
    totalProcessingTime: number;

    /** Average confidence across agents */
    averageConfidence: number;
  };

  /** Timestamp when collection was completed */
  timestamp: string;
}

/**
 * Engine output containing all agent outputs and analysis
 */
export interface EngineOutput {
  /** All agent outputs from this inference */
  agentOutputs: AgentOutput[];

  /** Sentinel analysis results */
  sentinelAnalysis?: {
    /** Bias detection results */
    biasDetected: boolean;

    /** Diversity analysis */
    diversityScore: number;

    /** Quality assessment */
    qualityScore: number;

    /** Recommendations */
    recommendations?: string[];

    /** Detailed analysis */
    analysis?: Record<string, any>;
  };

  /** Engine statistics */
  engineStatistics: {
    /** Total inference time */
    totalInferenceTime: number;

    /** Search statistics */
    searchStats?: Record<string, number>;

    /** Memory usage */
    memoryUsage?: number;

    /** Agent coordination stats */
    coordinationStats?: Record<string, number>;
  };

  /** Agent performance breakdown */
  agentPerformance: Record<string, AgentPerformanceMetrics>;

  /** Final recommended decision */
  recommendation?: {
    /** Best action */
    action: Action;

    /** Confidence in recommendation */
    confidence: number;

    /** Reasoning */
    reasoning: string;

    /** Contributing agents */
    contributors: string[];
  };

  /** Session information */
  session: {
    /** Session ID */
    sessionId: string;

    /** Task information */
    task: {
      id: string;
      name: string;
      domain: string;
    };

    /** Configuration used */
    config?: Record<string, any>;

    /** Timestamp */
    timestamp: string;
  };
}

/**
 * Factory for creating agent outputs
 */
export class AgentOutputFactory {
  static create(params: {
    agentId: string;
    agentName: string;
    providerType: string;
    evaluation: EvaluationResult;
    action?: ActionResult;
    statistics?: AgentPerformanceMetrics;
    role?: string;
    taskContext?: AgentOutput["taskContext"];
    processing?: AgentOutput["processing"];
    error?: AgentOutput["error"];
    metadata?: Record<string, any>;
  }): AgentOutput {
    const result: AgentOutput = {
      agentId: params.agentId,
      agentName: params.agentName,
      providerType: params.providerType,
      evaluation: params.evaluation,
      timestamp: new Date().toISOString(),
    };

    if (params.action !== undefined) result.action = params.action;
    if (params.statistics !== undefined) result.statistics = params.statistics;
    if (params.role !== undefined) result.role = params.role;
    if (params.taskContext !== undefined)
      result.taskContext = params.taskContext;
    if (params.processing !== undefined) result.processing = params.processing;
    if (params.error !== undefined) result.error = params.error;
    if (params.metadata !== undefined) result.metadata = params.metadata;

    return result;
  }

  static createError(params: {
    agentId: string;
    agentName: string;
    providerType: string;
    errorMessage: string;
    errorType?: string;
    isFallback?: boolean;
    fallbackEvaluation?: EvaluationResult;
  }): AgentOutput {
    const fallbackEval: EvaluationResult = params.fallbackEvaluation || {
      agentId: params.agentId,
      score: 0.5,
      confidence: 0.1,
      reasoning: `Error occurred: ${params.errorMessage}`,
      metadata: { error: true },
    };

    const result: AgentOutput = {
      agentId: params.agentId,
      agentName: params.agentName,
      providerType: params.providerType,
      evaluation: fallbackEval,
      timestamp: new Date().toISOString(),
      error: {
        hasError: true,
        message: params.errorMessage,
        isFallback: params.isFallback || true,
      },
    };

    if (params.errorType !== undefined) {
      result.error!.type = params.errorType;
    }

    return result;
  }
}

/**
 * Utility functions for working with agent outputs
 */
export class AgentOutputUtils {
  /**
   * Calculate average confidence across multiple outputs
   */
  static calculateAverageConfidence(outputs: AgentOutput[]): number {
    if (outputs.length === 0) return 0;

    const total = outputs.reduce(
      (sum, output) => sum + output.evaluation.confidence,
      0
    );
    return total / outputs.length;
  }

  /**
   * Find the output with highest confidence
   */
  static findHighestConfidence(outputs: AgentOutput[]): AgentOutput | null {
    if (outputs.length === 0) return null;

    return outputs.reduce((highest, current) =>
      current.evaluation.confidence > highest.evaluation.confidence
        ? current
        : highest
    );
  }

  /**
   * Filter outputs by minimum confidence threshold
   */
  static filterByConfidence(
    outputs: AgentOutput[],
    minConfidence: number
  ): AgentOutput[] {
    return outputs.filter(
      (output) => output.evaluation.confidence >= minConfidence
    );
  }

  /**
   * Group outputs by provider type
   */
  static groupByProvider(
    outputs: AgentOutput[]
  ): Record<string, AgentOutput[]> {
    return outputs.reduce(
      (groups, output) => {
        const provider = output.providerType;
        if (!groups[provider]) {
          groups[provider] = [];
        }
        groups[provider].push(output);
        return groups;
      },
      {} as Record<string, AgentOutput[]>
    );
  }

  /**
   * Extract evaluation results from outputs
   */
  static extractEvaluations(outputs: AgentOutput[]): EvaluationResult[] {
    return outputs.map((output) => output.evaluation);
  }

  /**
   * Check if any outputs have errors
   */
  static hasErrors(outputs: AgentOutput[]): boolean {
    return outputs.some((output) => output.error?.hasError);
  }

  /**
   * Get successful outputs (no errors)
   */
  static getSuccessfulOutputs(outputs: AgentOutput[]): AgentOutput[] {
    return outputs.filter((output) => !output.error?.hasError);
  }

  /**
   * Calculate score variance across outputs
   */
  static calculateScoreVariance(outputs: AgentOutput[]): number {
    if (outputs.length === 0) return 0;

    const scores = outputs.map((output) => output.evaluation.score);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance =
      scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) /
      scores.length;

    return Math.sqrt(variance);
  }
}
