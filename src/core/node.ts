/**
 * TreeNode implementation for MCTS with agent diversity support
 */

import { Identifiable } from '../types/common';
import { EvaluationResult } from '../types/evaluation';
import { GameState } from '../domains/base/game-state';
import { Action } from '../domains/base/action';

/**
 * Individual node in the MCTS tree
 */
export class TreeNode implements Identifiable {
  public readonly id: string;
  public readonly state: GameState;
  public readonly parent: TreeNode | undefined;
  public readonly action: Action | undefined;
  public readonly children: Map<string, TreeNode>;
  public readonly depth: number;
  
  // MCTS statistics
  public visits: number = 0;
  public totalReward: number = 0;
  public agentEvaluations: Map<string, EvaluationResult> = new Map();
  
  // Performance tracking
  public createdAt: number;
  public lastVisited: number;
  
  constructor(
    state: GameState,
    parent?: TreeNode,
    action?: Action
  ) {
    this.id = TreeNode.generateNodeId();
    this.state = state;
    this.parent = parent;
    this.action = action;
    this.children = new Map();
    this.depth = parent ? parent.depth + 1 : 0;
    this.createdAt = Date.now();
    this.lastVisited = this.createdAt;
  }

  /**
   * Add a child node for the given action and resulting state
   */
  addChild(action: Action, state: GameState): TreeNode {
    const childId = action.id;
    if (this.children.has(childId)) {
      throw new Error(`Child with action ${childId} already exists`);
    }
    
    const child = new TreeNode(state, this, action);
    this.children.set(childId, child);
    return child;
  }

  /**
   * Get child node for the given action ID
   */
  getChild(actionId: string): TreeNode | undefined {
    return this.children.get(actionId);
  }

  /**
   * Check if this is a leaf node (no children)
   */
  isLeaf(): boolean {
    return this.children.size === 0;
  }

  /**
   * Check if this is the root node (no parent)
   */
  isRoot(): boolean {
    return this.parent === undefined;
  }

  /**
   * Get the depth of this node in the tree
   */
  getDepth(): number {
    return this.depth;
  }

  /**
   * Calculate UCB1 value for node selection
   */
  calculateUCB1(explorationConstant: number): number {
    if (this.visits === 0) {
      return Infinity; // Unvisited nodes have highest priority
    }
    
    if (!this.parent || this.parent.visits === 0) {
      return this.getAverageReward();
    }
    
    const exploitation = this.getAverageReward();
    const exploration = Math.sqrt((2 * Math.log(this.parent.visits)) / this.visits);
    
    return exploitation + explorationConstant * exploration;
  }

  /**
   * Get the average reward for this node
   */
  getAverageReward(): number {
    if (this.visits === 0) return 0;
    return this.totalReward / this.visits;
  }

  /**
   * Update node statistics after a simulation
   */
  update(reward: number, agentId?: string, evaluation?: EvaluationResult): void {
    this.visits++;
    this.totalReward += reward;
    this.lastVisited = Date.now();
    
    if (agentId && evaluation) {
      this.agentEvaluations.set(agentId, evaluation);
    }
  }

  /**
   * Get all unvisited child actions
   */
  getUnexploredActions(): Action[] {
    const validActions = this.state.getValidActions();
    const exploredActionIds = new Set(this.children.keys());
    
    return validActions.filter(action => !exploredActionIds.has(action.id));
  }

  /**
   * Get the best child based on average reward
   */
  getBestChild(): TreeNode | undefined {
    if (this.children.size === 0) return undefined;
    
    let bestChild: TreeNode | undefined;
    let bestScore = -Infinity;
    
    for (const child of this.children.values()) {
      const score = child.getAverageReward();
      if (score > bestScore) {
        bestScore = score;
        bestChild = child;
      }
    }
    
    return bestChild;
  }

  /**
   * Get the most visited child
   */
  getMostVisitedChild(): TreeNode | undefined {
    if (this.children.size === 0) return undefined;
    
    let mostVisitedChild: TreeNode | undefined;
    let maxVisits = 0;
    
    for (const child of this.children.values()) {
      if (child.visits > maxVisits) {
        maxVisits = child.visits;
        mostVisitedChild = child;
      }
    }
    
    return mostVisitedChild;
  }

  /**
   * Get evaluation diversity score for this node
   */
  getEvaluationDiversity(): number {
    if (this.agentEvaluations.size < 2) return 0;
    
    const scores = Array.from(this.agentEvaluations.values()).map(evaluation => evaluation.score);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Get path from root to this node
   */
  getPathFromRoot(): TreeNode[] {
    const path: TreeNode[] = [];
    let current: TreeNode | undefined = this;
    
    while (current) {
      path.unshift(current);
      current = current.parent;
    }
    
    return path;
  }

  /**
   * Get principal variation (best path) from this node
   */
  getPrincipalVariation(maxDepth: number = 10): Action[] {
    const variation: Action[] = [];
    let current: TreeNode | undefined = this;
    let depth = 0;
    
    while (current && depth < maxDepth) {
      const bestChild = current.getBestChild();
      if (!bestChild || !bestChild.action) break;
      
      variation.push(bestChild.action);
      current = bestChild;
      depth++;
    }
    
    return variation;
  }

  /**
   * Generate statistics for this node
   */
  getNodeStatistics(): NodeStatistics {
    return {
      id: this.id,
      visits: this.visits,
      averageReward: this.getAverageReward(),
      childCount: this.children.size,
      depth: this.depth,
      isLeaf: this.isLeaf(),
      isRoot: this.isRoot(),
      agentEvaluationCount: this.agentEvaluations.size,
      diversityScore: this.getEvaluationDiversity(),
      createdAt: this.createdAt,
      lastVisited: this.lastVisited
    };
  }

  /**
   * Generate a unique node ID
   */
  private static generateNodeId(): string {
    return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  toString(): string {
    const actionDesc = this.action ? this.action.description : 'root';
    return `TreeNode(${actionDesc}, visits=${this.visits}, reward=${this.getAverageReward().toFixed(3)})`;
  }
}

/**
 * Statistics for a tree node
 */
export interface NodeStatistics {
  id: string;
  visits: number;
  averageReward: number;
  childCount: number;
  depth: number;
  isLeaf: boolean;
  isRoot: boolean;
  agentEvaluationCount: number;
  diversityScore: number;
  createdAt: number;
  lastVisited: number;
}