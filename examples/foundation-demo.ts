/**
 * Simple example demonstrating the current POLARIS framework foundation
 */

import {
  Logger,
  LogLevel,
  MathUtils,
  RandomUtils,
  MCTSTree,
  VERSION,
  POLARIS_INFO,
} from "../src/index";

// Simple mock game state for demonstration
class MockGameState {
  public readonly id: string;
  public readonly currentPlayer: number;
  public readonly isTerminal: boolean;
  public readonly winner: number | undefined;
  public readonly score: number | undefined;

  constructor(
    id: string,
    currentPlayer: number,
    isTerminal: boolean = false,
    winner: number | undefined = undefined,
    score: number | undefined = undefined
  ) {
    this.id = id;
    this.currentPlayer = currentPlayer;
    this.isTerminal = isTerminal;
    this.winner = winner;
    this.score = score;
  }

  clone() {
    return new MockGameState(
      this.id + "_clone",
      this.currentPlayer,
      this.isTerminal,
      this.winner,
      this.score
    );
  }
  applyAction() {
    return this.clone();
  }
  getValidActions() {
    return [];
  }
  serialize() {
    return JSON.stringify({ id: this.id, player: this.currentPlayer });
  }
  getFeatures() {
    return [this.currentPlayer, this.isTerminal ? 1 : 0];
  }
  getHashKey() {
    return this.id;
  }
  equals(other: any) {
    return this.id === other.id;
  }
  isDraw() {
    return this.isTerminal && this.winner === undefined;
  }
  getTurnNumber() {
    return 1;
  }
  getGameInfo() {
    return { id: this.id };
  }
}

async function demonstratePolarisFoundation() {
  console.log(`\n🌟 ${POLARIS_INFO.fullName} v${VERSION}`);
  console.log(`${POLARIS_INFO.description}\n`);

  // Initialize logger
  const logger = new Logger("Demo", LogLevel.INFO);
  logger.info("Starting POLARIS foundation demonstration");

  // Demonstrate math utilities
  logger.info("=== Math Utilities Demo ===");
  const scores = [0.8, 0.6, 0.9, 0.7, 0.5];
  const normalized = MathUtils.normalize(scores);
  const entropy = MathUtils.entropy([0.2, 0.3, 0.5]);
  const variance = MathUtils.variance(scores);

  console.log(`Original scores: [${scores.join(", ")}]`);
  console.log(
    `Normalized: [${normalized.map((s) => s.toFixed(3)).join(", ")}]`
  );
  console.log(`Entropy of [0.2, 0.3, 0.5]: ${entropy.toFixed(3)}`);
  console.log(`Variance: ${variance.toFixed(3)}`);

  // Demonstrate random utilities
  logger.info("=== Random Utilities Demo ===");
  RandomUtils.setSeed(12345);
  const randomNumbers = Array.from({ length: 5 }, () => RandomUtils.random());
  const randomChoice = RandomUtils.choice(["A", "B", "C", "D"]);
  const shuffledArray = RandomUtils.shuffle([1, 2, 3, 4, 5]);

  console.log(
    `Random numbers (seeded): [${randomNumbers.map((r) => r.toFixed(3)).join(", ")}]`
  );
  console.log(`Random choice from [A,B,C,D]: ${randomChoice}`);
  console.log(`Shuffled [1,2,3,4,5]: [${shuffledArray.join(", ")}]`);

  // Demonstrate tree structure
  logger.info("=== MCTS Tree Demo ===");
  const rootState = new MockGameState("root", 1);
  const tree = new MCTSTree(rootState);

  // Simulate adding some nodes
  const rootNode = tree.getRoot();
  console.log(`Root node: ${rootNode.toString()}`);

  // Simulate some visits and rewards
  rootNode.update(0.7);
  rootNode.update(0.8);
  rootNode.update(0.6);

  const treeStats = tree.getTreeStatistics();
  console.log(`Tree statistics:`, {
    nodes: treeStats.nodeCount,
    depth: treeStats.maxDepth,
    visits: treeStats.totalVisits,
    memoryUsage: `${(treeStats.memoryUsage / 1024).toFixed(1)} KB`,
  });

  // Demonstrate UCB1 calculation
  const ucb1Value = MathUtils.ucb1(0.7, 3, 10, Math.sqrt(2));
  console.log(
    `UCB1 value (value=0.7, visits=3, parent_visits=10): ${ucb1Value.toFixed(3)}`
  );

  logger.info("=== Framework Structure ===");
  console.log("✅ Core types and interfaces");
  console.log("✅ Base game state and action abstractions");
  console.log("✅ Agent interface and base implementation");
  console.log("✅ MCTS tree structure with node management");
  console.log("✅ Mathematical and utility functions");
  console.log("✅ Logging and error handling");
  console.log("✅ Search algorithms with agent diversity");
  console.log("✅ Sentinel agent system with bias detection");
  console.log("✅ Diversity analysis and score correction");
  console.log("⏳ POLARIS engine (next phase)");
  console.log("⏳ Chess domain implementation (planned)");
  console.log("⏳ Web API agent implementations (planned)");

  logger.info("POLARIS foundation demonstration completed");
}

// Run the demonstration
demonstratePolarisFoundation().catch(console.error);
