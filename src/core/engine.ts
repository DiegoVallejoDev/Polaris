/**
 * Main POLARIS Engine - Orchestrates the entire framework
 */

import { MCTSTree } from "./tree";
import { SearchAlgorithm, AgentSelector, SelectionStrategy } from "./search";
import { Agent } from "../agents/base/agent";
import { SentinelAgent, SentinelAnalysisContext } from "../sentinel/sentinel";
import { GameState } from "../domains/base/game-state";
import { PolarisConfig } from "../types/config";
import { SearchResult } from "../types/search";
import { EvaluationResult } from "../types/evaluation";
import { Logger } from "../utils/logger";
import { EnvironmentConfig } from "../utils/config";
import { PolarisError } from "../errors/base";

/**
 * POLARIS Engine execution result
 */
export interface PolarisResult extends SearchResult {
  /** Sentinel analysis results */
  sentinelAnalysis: any; // SentinelEvaluation from sentinel

  /** Engine-specific statistics */
  engineStatistics: EngineStatistics;

  /** Memory usage information */
  memoryUsage: MemoryUsage;

  /** Agent performance breakdown */
  agentPerformance: Map<string, AgentPerformanceMetrics>;
}

/**
 * Engine-specific statistics
 */
export interface EngineStatistics {
  /** Total engine execution time */
  totalExecutionTime: number;

  /** Time spent in different phases */
  phaseBreakdown: {
    initialization: number;
    search: number;
    sentinelAnalysis: number;
    cleanup: number;
  };

  /** Tree management statistics */
  treeStatistics: {
    maxNodes: number;
    totalPrunings: number;
    memoryPressureEvents: number;
  };

  /** Agent coordination statistics */
  agentCoordination: {
    totalAgentSwitches: number;
    averageResponseTime: number;
    failureRate: number;
  };
}

/**
 * Memory usage tracking
 */
export interface MemoryUsage {
  peakMemoryUsage: number;
  currentMemoryUsage: number;
  memoryPressureEvents: number;
  gcCollections: number;
}

/**
 * Agent performance metrics
 */
export interface AgentPerformanceMetrics {
  totalEvaluations: number;
  averageEvaluationTime: number;
  averageConfidence: number;
  successRate: number;
  contributionScore: number;
}

/**
 * Main POLARIS Engine class
 */
export class PolarisEngine {
  private config: PolarisConfig;
  private agents: Map<string, Agent>;
  private sentinel?: SentinelAgent;
  private searchAlgorithm?: SearchAlgorithm;
  private agentSelector?: AgentSelector;
  private logger: Logger;
  private memoryMonitor: MemoryMonitor;

  // Performance tracking
  private startTime: number = 0;
  private engineStatistics: EngineStatistics;

  constructor(config: PolarisConfig) {
    this.config = { ...config };
    this.agents = new Map();
    this.logger = new Logger(
      "PolarisEngine",
      EnvironmentConfig.POLARIS.logLevel
    );
    this.memoryMonitor = new MemoryMonitor(
      EnvironmentConfig.getMemoryLimitBytes()
    );

    // Initialize statistics
    this.engineStatistics = this.initializeEngineStatistics();

    // Initialize components
    this.initializeComponents();

    this.logger.info("POLARIS Engine created", {
      agentCount: config.agents.length,
      maxDepth: config.search.maxDepth,
      diversityThreshold: config.sentinel.diversityThreshold,
    });
  }

  /**
   * Main search method - the core of POLARIS
   */
  async search(initialState: GameState): Promise<PolarisResult> {
    this.startTime = performance.now();
    const phaseStart = performance.now();

    try {
      // Phase 1: Initialization
      this.logger.info("Starting POLARIS search", { stateId: initialState.id });
      await this.initializeSearch(initialState);
      this.engineStatistics.phaseBreakdown.initialization =
        performance.now() - phaseStart;

      // Phase 2: Create and populate search tree
      const tree = new MCTSTree(initialState);
      this.memoryMonitor.registerTree(tree);

      // Phase 3: Execute search with agent diversity
      const searchStart = performance.now();
      const searchResult = await this.executeSearch(tree);
      this.engineStatistics.phaseBreakdown.search =
        performance.now() - searchStart;

      // Phase 4: Sentinel analysis
      const sentinelStart = performance.now();
      const sentinelAnalysis = await this.performSentinelAnalysis(tree);
      this.engineStatistics.phaseBreakdown.sentinelAnalysis =
        performance.now() - sentinelStart;

      // Phase 5: Build final result
      const cleanupStart = performance.now();
      const result = await this.buildPolarisResult(
        searchResult,
        sentinelAnalysis,
        tree
      );
      this.engineStatistics.phaseBreakdown.cleanup =
        performance.now() - cleanupStart;

      // Update statistics
      this.finalizeStatistics();

      this.logger.info("POLARIS search completed", {
        bestAction: result.bestAction?.toString(),
        confidence: result.confidence,
        totalTime: result.engineStatistics.totalExecutionTime,
      });

      return result;
    } catch (error) {
      this.logger.error("POLARIS search failed", error);
      throw new PolarisError(
        `Search execution failed: ${error}`,
        "SEARCH_FAILED",
        { initialState: initialState.id, config: this.config }
      );
    }
  }

  /**
   * Add an agent to the engine
   */
  addAgent(agent: Agent): void {
    if (this.agents.has(agent.id)) {
      throw new PolarisError(`Agent with ID ${agent.id} already exists`);
    }

    this.agents.set(agent.id, agent);
    this.logger.info("Agent added", {
      agentId: agent.id,
      agentName: agent.name,
    });
  }

  /**
   * Remove an agent from the engine
   */
  removeAgent(agentId: string): boolean {
    const removed = this.agents.delete(agentId);
    if (removed) {
      this.logger.info("Agent removed", { agentId });
    }
    return removed;
  }

  /**
   * Get all registered agents
   */
  getAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Update the sentinel agent
   */
  setSentinel(sentinel: SentinelAgent): void {
    this.sentinel = sentinel;
    this.logger.info("Sentinel agent updated");
  }

  /**
   * Get the current sentinel agent
   */
  getSentinel(): SentinelAgent | undefined {
    return this.sentinel;
  }

  /**
   * Update engine configuration
   */
  updateConfig(config: Partial<PolarisConfig>): void {
    this.config = { ...this.config, ...config };

    // Update components with new configuration
    if (config.search) {
      this.searchAlgorithm = new SearchAlgorithm(this.config.search);
    }

    if (config.sentinel && this.sentinel) {
      this.sentinel.updateConfig(config.sentinel);
    }

    this.logger.info("Configuration updated", config);
  }

  /**
   * Get current configuration
   */
  getConfig(): PolarisConfig {
    return { ...this.config };
  }

  /**
   * Get current engine statistics
   */
  getStatistics(): EngineStatistics {
    return { ...this.engineStatistics };
  }

  /**
   * Reset all statistics
   */
  resetStatistics(): void {
    this.engineStatistics = this.initializeEngineStatistics();

    // Reset agent statistics
    for (const agent of this.agents.values()) {
      agent.resetStatistics();
    }

    // Reset sentinel statistics
    if (this.sentinel) {
      this.sentinel.clearHistory();
    }

    this.logger.info("All statistics reset");
  }

  /**
   * Perform cleanup and resource management
   */
  async cleanup(): Promise<void> {
    this.logger.info("Cleaning up POLARIS engine");

    // Cleanup agents
    for (const agent of this.agents.values()) {
      if (agent.cleanup) {
        try {
          await agent.cleanup();
        } catch (error) {
          this.logger.warn(`Failed to cleanup agent ${agent.id}`, error);
        }
      }
    }

    // Clear memory monitor
    this.memoryMonitor.cleanup();

    this.logger.info("POLARIS engine cleanup completed");
  }

  // Private helper methods

  private initializeComponents(): void {
    // Initialize search algorithm
    this.searchAlgorithm = new SearchAlgorithm(this.config.search);

    // Initialize agent selector
    const strategy =
      this.config.agents.length > 1
        ? SelectionStrategy.DIVERSITY_MAXIMIZING
        : SelectionStrategy.ROUND_ROBIN;
    this.agentSelector = new AgentSelector(strategy);

    // Initialize sentinel if provided
    if (this.config.sentinel) {
      this.sentinel = new SentinelAgent(this.config.sentinel);
    }

    // Add configured agents
    for (const agentConfig of this.config.agents) {
      if (agentConfig.enabled) {
        // Note: Agent creation would happen in the factory pattern
        // For now, we assume agents are added via addAgent()
      }
    }
  }

  private async initializeSearch(initialState: GameState): Promise<void> {
    if (!this.agents.size) {
      throw new PolarisError("No agents configured for search");
    }

    // Initialize all agents
    for (const agent of this.agents.values()) {
      if (agent.initialize && !agent.isReady()) {
        try {
          await agent.initialize();
        } catch (error) {
          this.logger.warn(`Failed to initialize agent ${agent.id}`, error);
        }
      }
    }

    // Validate initial state
    if (initialState.isTerminal) {
      throw new PolarisError("Cannot search from terminal state");
    }
  }

  private async executeSearch(tree: MCTSTree): Promise<SearchResult> {
    const availableAgents = Array.from(this.agents.values()).filter((agent) =>
      agent.isReady()
    );

    if (availableAgents.length === 0) {
      throw new PolarisError("No available agents for search");
    }

    if (!this.searchAlgorithm || !this.agentSelector) {
      throw new PolarisError(
        "Search algorithm or agent selector not initialized"
      );
    }

    return await this.searchAlgorithm.search(
      tree,
      availableAgents,
      this.agentSelector
    );
  }

  private async performSentinelAnalysis(tree: MCTSTree): Promise<any> {
    if (!this.sentinel) {
      this.logger.warn("No sentinel configured - skipping sentinel analysis");
      return null;
    }

    const root = tree.getRoot();
    const children = Array.from(root.children.values());

    const context: SentinelAnalysisContext = {
      node: root,
      children,
      depth: 0,
      history: this.collectEvaluationHistory(tree),
    };

    return await this.sentinel.evaluate(context);
  }

  private collectEvaluationHistory(tree: MCTSTree): EvaluationResult[] {
    const evaluations: EvaluationResult[] = [];

    tree.traverseDepthFirst((node) => {
      for (const evaluation of node.agentEvaluations.values()) {
        evaluations.push(evaluation);
      }
    });

    return evaluations;
  }

  private async buildPolarisResult(
    searchResult: SearchResult,
    sentinelAnalysis: any,
    _tree: MCTSTree
  ): Promise<PolarisResult> {
    return {
      ...searchResult,
      sentinelAnalysis,
      engineStatistics: { ...this.engineStatistics },
      memoryUsage: this.memoryMonitor.getMemoryUsage(),
      agentPerformance: this.calculateAgentPerformance(),
    };
  }

  private calculateAgentPerformance(): Map<string, AgentPerformanceMetrics> {
    const performance = new Map<string, AgentPerformanceMetrics>();

    for (const [agentId, agent] of this.agents) {
      const stats = agent.getStatistics();

      performance.set(agentId, {
        totalEvaluations: stats.totalEvaluations,
        averageEvaluationTime: stats.averageEvaluationTime,
        averageConfidence: stats.averageConfidence,
        successRate:
          stats.errorCount > 0
            ? (stats.totalEvaluations - stats.errorCount) /
              stats.totalEvaluations
            : 1.0,
        contributionScore: this.calculateContributionScore(stats),
      });
    }

    return performance;
  }

  private calculateContributionScore(stats: any): number {
    // Simple contribution score based on evaluations and confidence
    const baseScore = Math.min(stats.totalEvaluations / 100, 1.0);
    const confidenceBonus = stats.averageConfidence * 0.5;
    const reliabilityBonus = stats.errorCount === 0 ? 0.2 : 0;

    return Math.min(baseScore + confidenceBonus + reliabilityBonus, 1.0);
  }

  private initializeEngineStatistics(): EngineStatistics {
    return {
      totalExecutionTime: 0,
      phaseBreakdown: {
        initialization: 0,
        search: 0,
        sentinelAnalysis: 0,
        cleanup: 0,
      },
      treeStatistics: {
        maxNodes: 0,
        totalPrunings: 0,
        memoryPressureEvents: 0,
      },
      agentCoordination: {
        totalAgentSwitches: 0,
        averageResponseTime: 0,
        failureRate: 0,
      },
    };
  }

  private finalizeStatistics(): void {
    this.engineStatistics.totalExecutionTime =
      performance.now() - this.startTime;

    // Update tree statistics
    // Note: These would be tracked during execution in a full implementation
    this.engineStatistics.treeStatistics.memoryPressureEvents =
      this.memoryMonitor.getMemoryUsage().memoryPressureEvents;
  }
}

/**
 * Memory monitor for tracking and managing memory usage
 */
class MemoryMonitor {
  private trackedTrees: MCTSTree[] = [];
  private memoryUsage: MemoryUsage;

  constructor(memoryLimit: number) {
    // Store memory limit for future use
    console.log(`Memory monitor initialized with limit: ${memoryLimit} bytes`);
    this.memoryUsage = {
      peakMemoryUsage: 0,
      currentMemoryUsage: 0,
      memoryPressureEvents: 0,
      gcCollections: 0,
    };
  }

  registerTree(tree: MCTSTree): void {
    this.trackedTrees.push(tree);
  }

  getMemoryUsage(): MemoryUsage {
    // Update current memory usage
    this.memoryUsage.currentMemoryUsage = this.estimateMemoryUsage();
    this.memoryUsage.peakMemoryUsage = Math.max(
      this.memoryUsage.peakMemoryUsage,
      this.memoryUsage.currentMemoryUsage
    );

    return { ...this.memoryUsage };
  }

  cleanup(): void {
    this.trackedTrees = [];
  }

  private estimateMemoryUsage(): number {
    // Simple memory estimation based on tree sizes
    return this.trackedTrees.reduce((total, tree) => {
      return total + tree.getTreeStatistics().memoryUsage;
    }, 0);
  }
}
