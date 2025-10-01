/**
 * Centralized statistics management service for POLARIS framework
 * Eliminates duplicate statistics code and provides consistent metrics across components
 */

import { EvaluationResult } from "../types/evaluation";
import { Logger } from "./logger";

/**
 * Base statistics interface
 */
export interface BaseStatistics {
  startTime: number;
  lastUpdated: number;
  totalOperations: number;
  totalTime: number;
  averageTime: number;
  errorCount: number;
  successRate: number;
}

/**
 * Agent-specific statistics
 */
export interface AgentStatistics extends BaseStatistics {
  agentId: string;
  totalEvaluations: number;
  averageEvaluationTime: number;
  averageConfidence: number;
  selectionCount: number;
  performanceScore: number;
  totalThinkingTime: number;
  lastEvaluationTime?: number;

  // Performance metrics
  evaluationHistory: PerformanceDataPoint[];
  confidenceHistory: PerformanceDataPoint[];
}

/**
 * Search statistics
 */
export interface SearchStatistics extends BaseStatistics {
  nodesExplored: number;
  totalSimulations: number;
  searchTime: number;
  averageDepth: number;
  maxDepth: number;
  agentUsage: Map<string, number>;
  sentinelInterventions: number;
  nodesPerSecond: number;
  phaseTimings: PhaseTimings;
}

/**
 * Performance data point for tracking trends
 */
export interface PerformanceDataPoint {
  timestamp: number;
  value: number;
  metadata?: Record<string, any>;
}

/**
 * Phase timing breakdown
 */
export interface PhaseTimings {
  selection: number;
  expansion: number;
  simulation: number;
  backpropagation: number;
  sentinelAnalysis: number;
}

/**
 * Statistics configuration
 */
export interface StatisticsConfig {
  enableHistory: boolean;
  maxHistorySize: number;
  updateInterval: number;
  enablePerformanceTracking: boolean;
}

/**
 * Centralized statistics manager
 */
export class StatisticsManager {
  private agentStats = new Map<string, AgentStatistics>();
  private searchStats = new Map<string, SearchStatistics>();
  private globalStats: GlobalStatistics;
  private config: StatisticsConfig;
  private logger: Logger;

  constructor(config: Partial<StatisticsConfig> = {}) {
    this.config = {
      enableHistory: true,
      maxHistorySize: 1000,
      updateInterval: 1000,
      enablePerformanceTracking: true,
      ...config,
    };

    this.globalStats = this.initializeGlobalStats();
    this.logger = new Logger("StatisticsManager");

    this.logger.info("Statistics manager initialized", { config: this.config });
  }

  /**
   * Initialize agent statistics
   */
  initializeAgentStats(agentId: string): AgentStatistics {
    const stats: AgentStatistics = {
      agentId,
      startTime: Date.now(),
      lastUpdated: Date.now(),
      totalOperations: 0,
      totalTime: 0,
      averageTime: 0,
      errorCount: 0,
      successRate: 1.0,
      totalEvaluations: 0,
      averageEvaluationTime: 0,
      averageConfidence: 0,
      selectionCount: 0,
      performanceScore: 0,
      totalThinkingTime: 0,
      evaluationHistory: [],
      confidenceHistory: [],
    };

    this.agentStats.set(agentId, stats);
    this.logger.debug(`Initialized statistics for agent: ${agentId}`);
    return stats;
  }

  /**
   * Update agent statistics with evaluation result
   */
  updateAgentStats(agentId: string, evaluation: EvaluationResult): void {
    let stats = this.agentStats.get(agentId);
    if (!stats) {
      stats = this.initializeAgentStats(agentId);
    }

    const now = Date.now();
    const evaluationTime = evaluation.evaluationTime || 0;

    // Update basic counters
    stats.totalEvaluations++;
    stats.totalOperations++;
    stats.selectionCount++;
    stats.lastUpdated = now;
    stats.lastEvaluationTime = now;

    // Update timing statistics
    if (evaluationTime > 0) {
      stats.totalTime += evaluationTime;
      stats.totalThinkingTime += evaluationTime;
      stats.averageTime = stats.totalTime / stats.totalOperations;
      stats.averageEvaluationTime =
        stats.totalThinkingTime / stats.totalEvaluations;
    }

    // Update confidence tracking
    const totalConfidence =
      stats.averageConfidence * (stats.totalEvaluations - 1) +
      evaluation.confidence;
    stats.averageConfidence = totalConfidence / stats.totalEvaluations;

    // Update success rate (assuming no error if we have a valid evaluation)
    stats.successRate =
      (stats.totalOperations - stats.errorCount) / stats.totalOperations;

    // Update performance score (weighted combination of confidence and consistency)
    stats.performanceScore = this.calculatePerformanceScore(stats);

    // Track performance history if enabled
    if (this.config.enableHistory) {
      this.addToHistory(stats.evaluationHistory, now, evaluationTime);
      this.addToHistory(stats.confidenceHistory, now, evaluation.confidence);
    }

    this.agentStats.set(agentId, stats);
    this.updateGlobalStats();
  }

  /**
   * Record agent error
   */
  recordAgentError(agentId: string, _error: Error): void {
    let stats = this.agentStats.get(agentId);
    if (!stats) {
      stats = this.initializeAgentStats(agentId);
    }

    stats.errorCount++;
    stats.totalOperations++;
    stats.lastUpdated = Date.now();
    stats.successRate =
      (stats.totalOperations - stats.errorCount) / stats.totalOperations;
    stats.performanceScore = this.calculatePerformanceScore(stats);

    this.agentStats.set(agentId, stats);
    this.updateGlobalStats();

    this.logger.warn(`Recorded error for agent ${agentId}`, {
      errorCount: stats.errorCount,
      successRate: stats.successRate,
    });
  }

  /**
   * Initialize search statistics
   */
  initializeSearchStats(searchId: string): SearchStatistics {
    const stats: SearchStatistics = {
      startTime: Date.now(),
      lastUpdated: Date.now(),
      totalOperations: 0,
      totalTime: 0,
      averageTime: 0,
      errorCount: 0,
      successRate: 1.0,
      nodesExplored: 0,
      totalSimulations: 0,
      searchTime: 0,
      averageDepth: 0,
      maxDepth: 0,
      agentUsage: new Map(),
      sentinelInterventions: 0,
      nodesPerSecond: 0,
      phaseTimings: {
        selection: 0,
        expansion: 0,
        simulation: 0,
        backpropagation: 0,
        sentinelAnalysis: 0,
      },
    };

    this.searchStats.set(searchId, stats);
    this.logger.debug(`Initialized search statistics: ${searchId}`);
    return stats;
  }

  /**
   * Update search statistics
   */
  updateSearchStats(
    searchId: string,
    updates: Partial<SearchStatistics>
  ): void {
    let stats = this.searchStats.get(searchId);
    if (!stats) {
      stats = this.initializeSearchStats(searchId);
    }

    // Apply updates
    Object.assign(stats, updates);
    stats.lastUpdated = Date.now();

    // Recalculate derived metrics
    if (stats.searchTime > 0) {
      stats.nodesPerSecond = stats.nodesExplored / (stats.searchTime / 1000);
    }

    if (stats.totalSimulations > 0) {
      stats.averageDepth = stats.maxDepth / 2; // Approximation
    }

    this.searchStats.set(searchId, stats);
    this.updateGlobalStats();
  }

  /**
   * Get agent statistics
   */
  getAgentStats(agentId: string): AgentStatistics | undefined {
    return this.agentStats.get(agentId);
  }

  /**
   * Get all agent statistics
   */
  getAllAgentStats(): Map<string, AgentStatistics> {
    return new Map(this.agentStats);
  }

  /**
   * Get search statistics
   */
  getSearchStats(searchId: string): SearchStatistics | undefined {
    return this.searchStats.get(searchId);
  }

  /**
   * Get global statistics
   */
  getGlobalStats(): GlobalStatistics {
    return { ...this.globalStats };
  }

  /**
   * Reset statistics for an agent
   */
  resetAgentStats(agentId: string): void {
    this.agentStats.delete(agentId);
    this.updateGlobalStats();
    this.logger.info(`Reset statistics for agent: ${agentId}`);
  }

  /**
   * Reset all statistics
   */
  resetAllStats(): void {
    this.agentStats.clear();
    this.searchStats.clear();
    this.globalStats = this.initializeGlobalStats();
    this.logger.info("Reset all statistics");
  }

  /**
   * Get statistics summary
   */
  getSummary(): StatisticsSummary {
    const agentCount = this.agentStats.size;
    const searchCount = this.searchStats.size;

    const topPerformers = Array.from(this.agentStats.entries())
      .sort(([, a], [, b]) => b.performanceScore - a.performanceScore)
      .slice(0, 3)
      .map(([id, stats]) => ({ agentId: id, score: stats.performanceScore }));

    const totalEvaluations = Array.from(this.agentStats.values()).reduce(
      (sum, stats) => sum + stats.totalEvaluations,
      0
    );

    const averageConfidence =
      Array.from(this.agentStats.values()).reduce(
        (sum, stats) => sum + stats.averageConfidence,
        0
      ) / agentCount || 0;

    return {
      agentCount,
      searchCount,
      totalEvaluations,
      averageConfidence,
      topPerformers,
      globalStats: this.globalStats,
      uptime: Date.now() - this.globalStats.startTime,
    };
  }

  /**
   * Export statistics to JSON
   */
  exportStats(): string {
    const exportData = {
      timestamp: Date.now(),
      config: this.config,
      globalStats: this.globalStats,
      agentStats: Object.fromEntries(this.agentStats),
      searchStats: Object.fromEntries(this.searchStats),
      summary: this.getSummary(),
    };

    return JSON.stringify(exportData, null, 2);
  }

  // Private helper methods

  private calculatePerformanceScore(stats: AgentStatistics): number {
    // Weighted score combining multiple factors
    const confidenceWeight = 0.4;
    const consistencyWeight = 0.3;
    const speedWeight = 0.2;
    const reliabilityWeight = 0.1;

    const confidenceScore = Math.min(stats.averageConfidence, 1.0);

    // Consistency score based on confidence variance (simplified)
    const consistencyScore =
      stats.confidenceHistory.length > 1
        ? this.calculateConsistencyScore(stats.confidenceHistory)
        : 0.5;

    // Speed score (inverse of average evaluation time, normalized)
    const speedScore =
      stats.averageEvaluationTime > 0
        ? Math.min(1000 / stats.averageEvaluationTime, 1.0)
        : 0.5;

    // Reliability score
    const reliabilityScore = stats.successRate;

    return (
      confidenceScore * confidenceWeight +
      consistencyScore * consistencyWeight +
      speedScore * speedWeight +
      reliabilityScore * reliabilityWeight
    );
  }

  private calculateConsistencyScore(history: PerformanceDataPoint[]): number {
    if (history.length < 2) return 0.5;

    const values = history.slice(-20).map((point) => point.value); // Last 20 points
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      values.length;
    const standardDeviation = Math.sqrt(variance);

    // Lower standard deviation = higher consistency
    return Math.max(0, 1 - standardDeviation);
  }

  private addToHistory(
    history: PerformanceDataPoint[],
    timestamp: number,
    value: number
  ): void {
    history.push({ timestamp, value });

    // Trim history if too large
    if (history.length > this.config.maxHistorySize) {
      history.splice(0, history.length - this.config.maxHistorySize);
    }
  }

  private initializeGlobalStats(): GlobalStatistics {
    return {
      startTime: Date.now(),
      totalAgents: 0,
      totalSearches: 0,
      totalEvaluations: 0,
      totalErrors: 0,
      uptime: 0,
      memoryUsage: 0,
      averagePerformance: 0,
    };
  }

  private updateGlobalStats(): void {
    this.globalStats.totalAgents = this.agentStats.size;
    this.globalStats.totalSearches = this.searchStats.size;
    this.globalStats.uptime = Date.now() - this.globalStats.startTime;

    // Aggregate totals
    this.globalStats.totalEvaluations = Array.from(
      this.agentStats.values()
    ).reduce((sum, stats) => sum + stats.totalEvaluations, 0);

    this.globalStats.totalErrors = Array.from(this.agentStats.values()).reduce(
      (sum, stats) => sum + stats.errorCount,
      0
    );

    // Calculate average performance
    const performances = Array.from(this.agentStats.values()).map(
      (stats) => stats.performanceScore
    );

    this.globalStats.averagePerformance =
      performances.length > 0
        ? performances.reduce((sum, perf) => sum + perf, 0) /
          performances.length
        : 0;

    // Update memory usage (simplified)
    this.globalStats.memoryUsage = this.estimateMemoryUsage();
  }

  private estimateMemoryUsage(): number {
    // Simple memory estimation based on data structures
    let usage = 0;

    // Agent statistics
    for (const stats of this.agentStats.values()) {
      usage += JSON.stringify(stats).length;
    }

    // Search statistics
    for (const stats of this.searchStats.values()) {
      usage += JSON.stringify(stats).length;
    }

    return usage;
  }
}

/**
 * Global statistics interface
 */
export interface GlobalStatistics {
  startTime: number;
  totalAgents: number;
  totalSearches: number;
  totalEvaluations: number;
  totalErrors: number;
  uptime: number;
  memoryUsage: number;
  averagePerformance: number;
}

/**
 * Statistics summary interface
 */
export interface StatisticsSummary {
  agentCount: number;
  searchCount: number;
  totalEvaluations: number;
  averageConfidence: number;
  topPerformers: Array<{ agentId: string; score: number }>;
  globalStats: GlobalStatistics;
  uptime: number;
}

/**
 * Global statistics manager instance
 */
export const statisticsManager = new StatisticsManager();

/**
 * Statistics decorator for automatic stats tracking
 */
export function withStatistics(
  _target: any,
  _propertyName: string,
  descriptor: PropertyDescriptor
) {
  const method = descriptor.value;

  descriptor.value = async function (this: any, ...args: any[]) {
    const startTime = performance.now();
    const agentId = this.id || "unknown";

    try {
      const result = await method.apply(this, args);

      // Record successful operation
      const endTime = performance.now();
      const duration = endTime - startTime;

      if (result && typeof result === "object" && "confidence" in result) {
        // This looks like an evaluation result
        result.evaluationTime = duration;
        statisticsManager.updateAgentStats(agentId, result);
      }

      return result;
    } catch (error) {
      // Record error
      statisticsManager.recordAgentError(agentId, error as Error);
      throw error;
    }
  };

  return descriptor;
}
