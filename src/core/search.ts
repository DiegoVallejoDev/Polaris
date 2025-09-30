/**
 * Core search algorithms and selection strategies for POLARIS
 */

import { TreeNode } from "./node";
import { MCTSTree } from "./tree";
import { Action } from "../domains/base/action";
import { Agent } from "../agents/base/agent";
import { EvaluationResult } from "../types/evaluation";
import {
  SearchConfig,
  SearchResult,
  SearchStatistics,
  PhaseTimings,
} from "../types/search";
import { RandomUtils } from "../utils/math";
import { Logger } from "../utils/logger";
import { SearchError } from "../errors/base";

/**
 * Main search algorithm implementing MCTS with agent diversity
 */
export class SearchAlgorithm {
  private config: SearchConfig;
  private logger: Logger;
  private statistics: SearchStatistics;
  private phaseTimings: PhaseTimings;
  private startTime: number;

  constructor(config: SearchConfig) {
    this.config = config;
    this.logger = new Logger("SearchAlgorithm");
    this.statistics = this.initializeStatistics();
    this.phaseTimings = this.initializePhaseTimings();
    this.startTime = 0;
  }

  /**
   * Execute a complete MCTS search
   */
  async search(
    tree: MCTSTree,
    agents: Agent[],
    agentSelector: AgentSelector
  ): Promise<SearchResult> {
    this.startTime = performance.now();
    this.resetStatistics();

    const root = tree.getRoot();

    try {
      // Main MCTS loop
      for (
        let simulation = 0;
        simulation < this.config.simulationsPerNode;
        simulation++
      ) {
        // Check time limit
        if (this.isTimeExceeded()) {
          this.logger.info(
            `Search terminated due to time limit after ${simulation} simulations`
          );
          break;
        }

        // Execute one MCTS iteration
        await this.executeIteration(tree, agents, agentSelector);

        // Check early termination conditions
        if (this.config.earlyTermination && this.shouldTerminateEarly(root)) {
          this.logger.info(
            `Search terminated early after ${simulation} simulations`
          );
          break;
        }
      }

      // Calculate final statistics
      this.finalizeStatistics();

      // Build and return search result
      return this.buildSearchResult(tree);
    } catch (error) {
      this.logger.error("Search failed", error);
      throw new SearchError(`Search execution failed: ${error}`, {
        statistics: this.statistics,
        config: this.config,
      });
    }
  }

  /**
   * Execute one complete MCTS iteration
   */
  private async executeIteration(
    tree: MCTSTree,
    agents: Agent[],
    agentSelector: AgentSelector
  ): Promise<void> {
    // Phase 1: Selection
    const selectedNode = await this.selection(tree.getRoot());

    // Phase 2: Expansion
    const expandedNodes = await this.expansion(selectedNode);

    // Phase 3: Simulation for each expanded node
    for (const node of expandedNodes) {
      const agent = agentSelector.selectAgent(node, agents);
      const reward = await this.simulation(node, agent);

      // Phase 4: Backpropagation
      await this.backpropagation(node, reward, agent.id);
    }

    this.statistics.totalSimulations++;
  }

  /**
   * MCTS Selection phase - traverse tree using UCB1
   */
  async selection(root: TreeNode): Promise<TreeNode> {
    const startTime = performance.now();

    let current = root;

    // Traverse down the tree using UCB1 until we reach a leaf or unexplored node
    while (!current.isLeaf() && current.getUnexploredActions().length === 0) {
      current = this.selectBestChild(current);
      this.statistics.maxDepth = Math.max(
        this.statistics.maxDepth,
        current.depth
      );
    }

    this.phaseTimings.selection += performance.now() - startTime;
    return current;
  }

  /**
   * MCTS Expansion phase - add new child nodes
   */
  async expansion(node: TreeNode): Promise<TreeNode[]> {
    const startTime = performance.now();
    const expandedNodes: TreeNode[] = [];

    // If this is a terminal state, return the node itself
    if (node.state.isTerminal) {
      this.phaseTimings.expansion += performance.now() - startTime;
      return [node];
    }

    // Get unexplored actions
    const unexploredActions = node.getUnexploredActions();

    if (unexploredActions.length === 0) {
      // Node is fully expanded, return it for simulation
      expandedNodes.push(node);
    } else {
      // Expand one or more children based on progressive widening
      const actionsToExpand = this.getActionsToExpand(
        unexploredActions,
        node.visits
      );

      for (const action of actionsToExpand) {
        try {
          const newState = node.state.applyAction(action);
          const childNode = new TreeNode(newState, node, action);
          node.children.set(action.id, childNode);
          expandedNodes.push(childNode);

          this.statistics.nodesExplored++;
        } catch (error) {
          this.logger.warn(`Failed to expand action ${action.id}`, error);
        }
      }
    }

    this.phaseTimings.expansion += performance.now() - startTime;
    return expandedNodes;
  }

  /**
   * MCTS Simulation phase - evaluate position using agent
   */
  async simulation(node: TreeNode, agent: Agent): Promise<number> {
    const startTime = performance.now();

    try {
      // Get agent evaluation
      const evaluation = await agent.evaluate(node.state);

      // Store agent evaluation in node
      node.agentEvaluations.set(agent.id, evaluation);

      // Update agent usage statistics
      const currentUsage = this.statistics.agentUsage.get(agent.id) || 0;
      this.statistics.agentUsage.set(agent.id, currentUsage + 1);

      this.phaseTimings.simulation += performance.now() - startTime;
      return evaluation.score;
    } catch (error) {
      this.logger.error(`Simulation failed for agent ${agent.id}`, error);
      this.phaseTimings.simulation += performance.now() - startTime;
      return 0; // Default score on error
    }
  }

  /**
   * MCTS Backpropagation phase - update node statistics
   */
  async backpropagation(
    node: TreeNode,
    reward: number,
    agentId: string
  ): Promise<void> {
    const startTime = performance.now();

    let current: TreeNode | undefined = node;

    // Propagate reward up the tree
    while (current) {
      current.update(reward, agentId);
      current = current.parent;
    }

    this.phaseTimings.backpropagation += performance.now() - startTime;
  }

  /**
   * Select the best child using UCB1
   */
  selectBestChild(node: TreeNode): TreeNode {
    let bestChild: TreeNode | undefined;
    let bestValue = -Infinity;

    for (const child of node.children.values()) {
      const ucb1Value = child.calculateUCB1(this.config.explorationConstant);

      if (ucb1Value > bestValue) {
        bestValue = ucb1Value;
        bestChild = child;
      }
    }

    if (!bestChild) {
      throw new SearchError("No best child found during selection");
    }

    return bestChild;
  }

  /**
   * Determine which actions to expand based on progressive widening
   */
  private getActionsToExpand(
    unexploredActions: Action[],
    visits: number
  ): Action[] {
    if (!this.config.progressiveWidening) {
      // Expand only one action if progressive widening is disabled
      return [RandomUtils.choice(unexploredActions)];
    }

    // Progressive widening: expand more actions as visit count increases
    const maxExpansions = Math.min(
      Math.ceil(Math.sqrt(visits + 1)),
      unexploredActions.length
    );

    // Randomly select actions to expand
    const shuffled = RandomUtils.shuffle(unexploredActions);
    return shuffled.slice(0, maxExpansions);
  }

  /**
   * Check if search should terminate early
   */
  private shouldTerminateEarly(root: TreeNode): boolean {
    if (!this.config.earlyTermination) return false;

    const config = this.config.earlyTermination;

    // Check minimum simulations
    if (this.statistics.totalSimulations < config.minSimulations) {
      return false;
    }

    // Check confidence threshold
    if (config.confidenceThreshold && root.children.size > 0) {
      const bestChild = root.getBestChild();
      if (bestChild) {
        const confidence = this.calculateMoveConfidence(root, bestChild);
        if (confidence >= config.confidenceThreshold) {
          return true;
        }
      }
    }

    // Check score difference
    if (config.scoreDifference && root.children.size >= 2) {
      const children = Array.from(root.children.values()).sort(
        (a, b) => b.getAverageReward() - a.getAverageReward()
      );

      if (children.length >= 2) {
        const scoreDiff =
          children[0].getAverageReward() - children[1].getAverageReward();
        if (scoreDiff >= config.scoreDifference) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Calculate confidence in the best move
   */
  private calculateMoveConfidence(
    parent: TreeNode,
    bestChild: TreeNode
  ): number {
    if (parent.visits === 0) return 0;

    // Confidence based on visit ratio and score difference
    const visitRatio = bestChild.visits / parent.visits;
    const avgScore = bestChild.getAverageReward();

    // Simple confidence metric (can be enhanced)
    return Math.min((visitRatio * (avgScore + 1)) / 2, 1.0);
  }

  /**
   * Check if time limit is exceeded
   */
  private isTimeExceeded(): boolean {
    if (!this.config.timeLimit) return false;

    const elapsed = performance.now() - this.startTime;
    return elapsed >= this.config.timeLimit;
  }

  /**
   * Build the final search result
   */
  private buildSearchResult(tree: MCTSTree): SearchResult {
    const root = tree.getRoot();
    const bestChild = root.getMostVisitedChild();

    if (!bestChild || !bestChild.action) {
      throw new SearchError("No best action found after search");
    }

    // Collect all evaluations
    const evaluations: EvaluationResult[] = [];
    tree.traverseDepthFirst((node) => {
      for (const evaluation of node.agentEvaluations.values()) {
        evaluations.push(evaluation);
      }
    });

    return {
      bestAction: bestChild.action,
      bestScore: bestChild.getAverageReward(),
      confidence: this.calculateMoveConfidence(root, bestChild),
      statistics: { ...this.statistics },
      evaluations,
      principalVariation: root.getPrincipalVariation(),
      completedAt: Date.now(),
    };
  }

  // Statistics management methods
  private initializeStatistics(): SearchStatistics {
    return {
      nodesExplored: 0,
      totalSimulations: 0,
      searchTime: 0,
      averageDepth: 0,
      maxDepth: 0,
      agentUsage: new Map(),
      sentinelInterventions: 0,
      nodesPerSecond: 0,
      phaseTimings: this.initializePhaseTimings(),
    };
  }

  private initializePhaseTimings(): PhaseTimings {
    return {
      selection: 0,
      expansion: 0,
      simulation: 0,
      backpropagation: 0,
      sentinelAnalysis: 0,
    };
  }

  private resetStatistics(): void {
    this.statistics = this.initializeStatistics();
    this.phaseTimings = this.initializePhaseTimings();
  }

  private finalizeStatistics(): void {
    const totalTime = performance.now() - this.startTime;

    this.statistics.searchTime = totalTime;
    this.statistics.nodesPerSecond =
      this.statistics.nodesExplored / (totalTime / 1000);
    this.statistics.phaseTimings = { ...this.phaseTimings };

    if (this.statistics.totalSimulations > 0) {
      this.statistics.averageDepth = this.statistics.maxDepth / 2; // Approximation
    }
  }
}

/**
 * Agent selection strategies for diverse evaluation
 */
export enum SelectionStrategy {
  ROUND_ROBIN = "round_robin",
  PERFORMANCE_BASED = "performance_based",
  DIVERSITY_MAXIMIZING = "diversity_maximizing",
  ADAPTIVE = "adaptive",
  RANDOM = "random",
}

/**
 * Agent selector for choosing which agent to use for evaluation
 */
export class AgentSelector {
  private strategy: SelectionStrategy;
  private agentPerformance: Map<string, number>;
  private lastSelectedIndex: number;
  private logger: Logger;

  constructor(strategy: SelectionStrategy = SelectionStrategy.ROUND_ROBIN) {
    this.strategy = strategy;
    this.agentPerformance = new Map();
    this.lastSelectedIndex = -1;
    this.logger = new Logger("AgentSelector");
  }

  /**
   * Select an agent for evaluating the given node
   */
  selectAgent(node: TreeNode, availableAgents: Agent[]): Agent {
    if (availableAgents.length === 0) {
      throw new SearchError("No agents available for selection");
    }

    if (availableAgents.length === 1) {
      return availableAgents[0];
    }

    switch (this.strategy) {
      case SelectionStrategy.ROUND_ROBIN:
        return this.selectRoundRobin(availableAgents);

      case SelectionStrategy.PERFORMANCE_BASED:
        return this.selectPerformanceBased(availableAgents);

      case SelectionStrategy.DIVERSITY_MAXIMIZING:
        return this.selectDiversityMaximizing(node, availableAgents);

      case SelectionStrategy.ADAPTIVE:
        return this.selectAdaptive(node, availableAgents);

      case SelectionStrategy.RANDOM:
        return RandomUtils.choice(availableAgents);

      default:
        this.logger.warn(
          `Unknown selection strategy: ${this.strategy}, falling back to round-robin`
        );
        return this.selectRoundRobin(availableAgents);
    }
  }

  /**
   * Update agent performance based on evaluation quality
   */
  updatePerformance(agentId: string, performance: number): void {
    const currentPerf = this.agentPerformance.get(agentId) || 0;
    // Exponential moving average
    const alpha = 0.1;
    const newPerf = alpha * performance + (1 - alpha) * currentPerf;
    this.agentPerformance.set(agentId, newPerf);
  }

  /**
   * Get agent statistics
   */
  getAgentStatistics(): Map<string, AgentStats> {
    const stats = new Map<string, AgentStats>();

    for (const [agentId, performance] of this.agentPerformance) {
      stats.set(agentId, {
        agentId,
        performance,
        selectionCount: 0, // This would be tracked separately in practice
      });
    }

    return stats;
  }

  // Selection strategy implementations
  private selectRoundRobin(agents: Agent[]): Agent {
    this.lastSelectedIndex = (this.lastSelectedIndex + 1) % agents.length;
    return agents[this.lastSelectedIndex];
  }

  private selectPerformanceBased(agents: Agent[]): Agent {
    // Select based on performance scores
    const weights = agents.map((agent) => {
      const performance = this.agentPerformance.get(agent.id) || 0.5;
      return Math.max(performance, 0.1); // Minimum weight to ensure all agents get some chance
    });

    return RandomUtils.weightedChoice(agents, weights);
  }

  private selectDiversityMaximizing(node: TreeNode, agents: Agent[]): Agent {
    // Select agent that hasn't evaluated this node yet, or the least used one
    const evaluatedAgents = new Set(node.agentEvaluations.keys());

    // Prefer agents that haven't evaluated this node
    const unevaluatedAgents = agents.filter(
      (agent) => !evaluatedAgents.has(agent.id)
    );
    if (unevaluatedAgents.length > 0) {
      return RandomUtils.choice(unevaluatedAgents);
    }

    // If all have evaluated, choose the one with lowest usage
    return agents.reduce((minAgent, agent) => {
      const minUsage = this.agentPerformance.get(minAgent.id) || 0;
      const agentUsage = this.agentPerformance.get(agent.id) || 0;
      return agentUsage < minUsage ? agent : minAgent;
    });
  }

  private selectAdaptive(node: TreeNode, agents: Agent[]): Agent {
    // Adaptive strategy: balance performance and diversity based on node depth
    const depthFactor = Math.min(node.depth / 10, 1); // Normalize depth

    if (depthFactor < 0.3) {
      // Early in the tree: prioritize diversity
      return this.selectDiversityMaximizing(node, agents);
    } else if (depthFactor > 0.7) {
      // Deep in the tree: prioritize performance
      return this.selectPerformanceBased(agents);
    } else {
      // Middle: balanced approach
      return Math.random() < 0.5
        ? this.selectDiversityMaximizing(node, agents)
        : this.selectPerformanceBased(agents);
    }
  }
}

/**
 * Statistics for individual agents
 */
export interface AgentStats {
  agentId: string;
  performance: number;
  selectionCount: number;
}
