/**
 * MCTS Tree implementation with agent diversity support
 */

import { TreeNode, NodeStatistics } from './node';
import { GameState } from '../domains/base/game-state';
import { Action } from '../domains/base/action';

/**
 * Monte Carlo Tree Search tree structure
 */
export class MCTSTree {
  private root: TreeNode;
  private nodeCount: number = 1;
  private maxMemoryUsage: number;
  
  constructor(rootState: GameState, maxMemoryUsage: number = 1024 * 1024 * 100) { // 100MB default
    this.root = new TreeNode(rootState);
    this.maxMemoryUsage = maxMemoryUsage;
  }

  /**
   * Get the root node of the tree
   */
  getRoot(): TreeNode {
    return this.root;
  }

  /**
   * Add a new node to the tree
   */
  addNode(parent: TreeNode, action: Action, state: GameState): TreeNode {
    const child = parent.addChild(action, state);
    this.nodeCount++;
    
    // Check memory usage and prune if necessary
    if (this.nodeCount % 1000 === 0) {
      this.checkMemoryUsage();
    }
    
    return child;
  }

  /**
   * Remove a subtree starting from the given node
   */
  removeSubtree(node: TreeNode): void {
    const subtreeSize = this.getSubtreeSize(node);
    
    if (node.parent) {
      const parent = node.parent;
      const actionId = node.action?.id;
      if (actionId) {
        parent.children.delete(actionId);
      }
    }
    
    this.nodeCount -= subtreeSize;
  }

  /**
   * Find the best path from root based on visit counts
   */
  findBestPath(): TreeNode[] {
    const path: TreeNode[] = [this.root];
    let current = this.root;
    
    while (current.children.size > 0) {
      const bestChild = current.getMostVisitedChild();
      if (!bestChild) break;
      
      path.push(bestChild);
      current = bestChild;
    }
    
    return path;
  }

  /**
   * Get the maximum depth of the tree
   */
  getDepth(): number {
    return this.getMaxDepthRecursive(this.root);
  }

  /**
   * Get the total number of nodes in the tree
   */
  getNodeCount(): number {
    return this.nodeCount;
  }

  /**
   * Prune the tree to keep only the specified depth
   */
  pruneTree(keepDepth: number): void {
    if (keepDepth <= 0) {
      this.clear();
      return;
    }
    
    this.pruneTreeRecursive(this.root, 0, keepDepth);
    this.recalculateNodeCount();
  }

  /**
   * Clear the entire tree except the root
   */
  clear(): void {
    this.root.children.clear();
    this.root.agentEvaluations.clear();
    this.root.visits = 0;
    this.root.totalReward = 0;
    this.nodeCount = 1;
  }

  /**
   * Set a new root (useful for making a move)
   */
  setNewRoot(newRootState: GameState, actionFromCurrentRoot?: Action): void {
    let newRoot: TreeNode | undefined;
    
    // Try to find the new root in existing children
    if (actionFromCurrentRoot) {
      newRoot = this.root.getChild(actionFromCurrentRoot.id);
    }
    
    // If not found, create a new root
    if (!newRoot) {
      newRoot = new TreeNode(newRootState);
      this.nodeCount = 1;
    } else {
      // Update node count by removing the old root's siblings
      const keptSubtreeSize = this.getSubtreeSize(newRoot);
      this.nodeCount = keptSubtreeSize;
      
      // Detach from parent
      newRoot.parent?.children.delete(actionFromCurrentRoot!.id);
    }
    
    this.root = newRoot;
  }

  /**
   * Get tree statistics
   */
  getTreeStatistics(): TreeStatistics {
    return {
      nodeCount: this.nodeCount,
      maxDepth: this.getDepth(),
      averageBranchingFactor: this.getAverageBranchingFactor(),
      memoryUsage: this.estimateMemoryUsage(),
      totalVisits: this.getTotalVisits(),
      rootStatistics: this.root.getNodeStatistics()
    };
  }

  /**
   * Find all leaf nodes in the tree
   */
  getLeafNodes(): TreeNode[] {
    const leaves: TreeNode[] = [];
    this.collectLeafNodes(this.root, leaves);
    return leaves;
  }

  /**
   * Find nodes at a specific depth
   */
  getNodesAtDepth(depth: number): TreeNode[] {
    const nodes: TreeNode[] = [];
    this.collectNodesAtDepth(this.root, depth, 0, nodes);
    return nodes;
  }

  /**
   * Perform a depth-first traversal
   */
  traverseDepthFirst(visitor: (node: TreeNode) => void): void {
    this.traverseDepthFirstRecursive(this.root, visitor);
  }

  /**
   * Perform a breadth-first traversal
   */
  traverseBreadthFirst(visitor: (node: TreeNode) => void): void {
    const queue: TreeNode[] = [this.root];
    
    while (queue.length > 0) {
      const node = queue.shift()!;
      visitor(node);
      
      for (const child of node.children.values()) {
        queue.push(child);
      }
    }
  }

  // Private helper methods

  private getMaxDepthRecursive(node: TreeNode): number {
    if (node.children.size === 0) {
      return node.depth;
    }
    
    let maxDepth = node.depth;
    for (const child of node.children.values()) {
      maxDepth = Math.max(maxDepth, this.getMaxDepthRecursive(child));
    }
    
    return maxDepth;
  }

  private getSubtreeSize(node: TreeNode): number {
    let size = 1;
    for (const child of node.children.values()) {
      size += this.getSubtreeSize(child);
    }
    return size;
  }

  private pruneTreeRecursive(node: TreeNode, currentDepth: number, maxDepth: number): void {
    if (currentDepth >= maxDepth) {
      node.children.clear();
      return;
    }
    
    for (const child of node.children.values()) {
      this.pruneTreeRecursive(child, currentDepth + 1, maxDepth);
    }
  }

  private recalculateNodeCount(): void {
    this.nodeCount = this.getSubtreeSize(this.root);
  }

  private getAverageBranchingFactor(): number {
    let totalBranching = 0;
    let internalNodes = 0;
    
    this.traverseDepthFirst((node) => {
      if (node.children.size > 0) {
        totalBranching += node.children.size;
        internalNodes++;
      }
    });
    
    return internalNodes > 0 ? totalBranching / internalNodes : 0;
  }

  private estimateMemoryUsage(): number {
    // Rough estimation: each node uses approximately 1KB
    return this.nodeCount * 1024;
  }

  private getTotalVisits(): number {
    let totalVisits = 0;
    this.traverseDepthFirst((node) => {
      totalVisits += node.visits;
    });
    return totalVisits;
  }

  private collectLeafNodes(node: TreeNode, leaves: TreeNode[]): void {
    if (node.isLeaf()) {
      leaves.push(node);
    } else {
      for (const child of node.children.values()) {
        this.collectLeafNodes(child, leaves);
      }
    }
  }

  private collectNodesAtDepth(node: TreeNode, targetDepth: number, currentDepth: number, nodes: TreeNode[]): void {
    if (currentDepth === targetDepth) {
      nodes.push(node);
      return;
    }
    
    if (currentDepth < targetDepth) {
      for (const child of node.children.values()) {
        this.collectNodesAtDepth(child, targetDepth, currentDepth + 1, nodes);
      }
    }
  }

  private traverseDepthFirstRecursive(node: TreeNode, visitor: (node: TreeNode) => void): void {
    visitor(node);
    for (const child of node.children.values()) {
      this.traverseDepthFirstRecursive(child, visitor);
    }
  }

  private checkMemoryUsage(): void {
    const currentUsage = this.estimateMemoryUsage();
    if (currentUsage > this.maxMemoryUsage) {
      // Prune the tree to reduce memory usage
      const currentDepth = this.getDepth();
      const newMaxDepth = Math.max(1, Math.floor(currentDepth * 0.8));
      this.pruneTree(newMaxDepth);
    }
  }
}

/**
 * Statistics about the tree structure
 */
export interface TreeStatistics {
  nodeCount: number;
  maxDepth: number;
  averageBranchingFactor: number;
  memoryUsage: number;
  totalVisits: number;
  rootStatistics: NodeStatistics;
}