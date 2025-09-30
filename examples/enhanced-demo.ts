/**
 * Enhanced POLARIS demonstration showcasing search algorithms and Sentinel Agent
 */

import {
  Logger,
  LogLevel,
  MathUtils,
  RandomUtils,
  MCTSTree,
  SearchAlgorithm,
  AgentSelector,
  SelectionStrategy,
  SentinelAgent,
  BiasDetector,
  DiversityAnalyzer,
  VERSION,
  POLARIS_INFO,
} from "../src/index.js";

// Mock implementations for demonstration
class MockGameState {
  public id: string;
  public currentPlayer: number;
  public isTerminal: boolean;
  public winner: number | undefined;
  public score: number | undefined;

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

  clone(): MockGameState {
    return new MockGameState(
      this.id + "_clone",
      this.currentPlayer,
      this.isTerminal,
      this.winner,
      this.score
    );
  }

  applyAction(action: MockAction): MockGameState {
    const newId = `${this.id}_${action.id}`;
    const nextPlayer = this.currentPlayer === 1 ? 2 : 1;
    return new MockGameState(newId, nextPlayer, false);
  }

  getValidActions(): MockAction[] {
    if (this.isTerminal) return [];
    return [
      new MockAction("move1", "Move to position A"),
      new MockAction("move2", "Move to position B"),
      new MockAction("move3", "Move to position C"),
    ];
  }

  getFeatures(): number[] {
    return [Math.random(), Math.random(), Math.random()];
  }

  serialize(): string {
    return JSON.stringify({ id: this.id, player: this.currentPlayer });
  }

  getHashKey(): string {
    return this.id;
  }

  equals(other: MockGameState): boolean {
    return this.id === other.id;
  }

  isDraw(): boolean {
    return this.isTerminal && this.winner === undefined;
  }

  getTurnNumber(): number {
    return parseInt(this.id.split("_").length.toString()) || 1;
  }

  getGameInfo(): Record<string, any> {
    return { id: this.id, player: this.currentPlayer };
  }
}

class MockAction {
  public id: string;
  public description: string;
  public type: string;

  constructor(id: string, description: string, type: string = "move") {
    this.id = id;
    this.description = description;
    this.type = type;
  }

  isValid(): boolean {
    return true;
  }

  getCost(): number {
    return 1;
  }

  getMetadata(): Record<string, any> {
    return { id: this.id, type: this.type };
  }

  serialize(): string {
    return JSON.stringify({ id: this.id, description: this.description });
  }

  getHashKey(): string {
    return this.id;
  }

  equals(other: MockAction): boolean {
    return this.id === other.id;
  }
}

class MockAgent {
  public id: string;
  public name: string;
  public type: string;
  public bias: number;

  constructor(
    id: string,
    name: string,
    type: string,
    bias: number = 0 // -1 to 1, affects scoring
  ) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.bias = bias;
  }

  async evaluate(state: MockGameState): Promise<any> {
    // Simulate evaluation time
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));

    // Generate score with bias
    const baseScore = Math.random();
    const biasedScore = Math.max(0, Math.min(1, baseScore + this.bias * 0.3));

    return {
      score: biasedScore,
      confidence: Math.random() * 0.5 + 0.5, // 0.5 to 1.0
      reasoning: `Agent ${this.name} evaluated state ${state.id}`,
      agentId: this.id,
      timestamp: Date.now(),
      evaluationTime: Math.random() * 20 + 5,
    };
  }

  async selectAction(
    _state: MockGameState,
    actions: MockAction[]
  ): Promise<MockAction> {
    return RandomUtils.choice(actions);
  }

  clone(): MockAgent {
    return new MockAgent(this.id + "_clone", this.name, this.type, this.bias);
  }

  getStatistics(): any {
    return {
      agentId: this.id,
      totalEvaluations: 0,
      averageEvaluationTime: 0,
      averageConfidence: 0,
      selectionCount: 0,
      performanceScore: 0,
      totalThinkingTime: 0,
      errorCount: 0,
    };
  }

  resetStatistics(): void {}
  isReady(): boolean {
    return true;
  }
  getMetadata(): any {
    return { id: this.id, name: this.name };
  }
}

async function runEnhancedDemo() {
  const logger = new Logger("EnhancedDemo", LogLevel.INFO);

  console.log(`🌟 ${POLARIS_INFO.fullName} v${VERSION}`);
  console.log(`${POLARIS_INFO.description}\n`);

  logger.info("Starting enhanced POLARIS demonstration");

  // === Search Algorithm Demo ===
  logger.info("=== Search Algorithm Demo ===");

  const initialState = new MockGameState("root", 1);
  const tree = new MCTSTree(initialState as any);

  // Create diverse agents with different biases
  const agents = [
    new MockAgent("aggressive", "Aggressive Agent", "heuristic", 0.3),
    new MockAgent("conservative", "Conservative Agent", "heuristic", -0.2),
    new MockAgent("balanced", "Balanced Agent", "heuristic", 0.0),
    new MockAgent("optimistic", "Optimistic Agent", "ml", 0.4),
    new MockAgent("pessimistic", "Pessimistic Agent", "ml", -0.3),
  ];

  // Configure search
  const searchConfig = {
    maxDepth: 5,
    simulationsPerNode: 20,
    timeLimit: 1000,
    explorationConstant: Math.sqrt(2),
    parallelism: 1,
    progressiveWidening: true,
    earlyTermination: {
      confidenceThreshold: 0.9,
      scoreDifference: 0.3,
      minSimulations: 10,
    },
  };

  const searchAlgorithm = new SearchAlgorithm(searchConfig);
  const agentSelector = new AgentSelector(
    SelectionStrategy.DIVERSITY_MAXIMIZING
  );

  logger.info("Running MCTS search with agent diversity...");

  try {
    const searchResult = await searchAlgorithm.search(
      tree,
      agents as any,
      agentSelector
    );

    console.log(
      `✅ Search completed in ${searchResult.statistics.searchTime.toFixed(2)}ms`
    );
    console.log(
      `   Best action: ${searchResult.bestAction?.description || "Unknown"}`
    );
    console.log(`   Best score: ${searchResult.bestScore.toFixed(3)}`);
    console.log(`   Confidence: ${searchResult.confidence.toFixed(3)}`);
    console.log(`   Nodes explored: ${searchResult.statistics.nodesExplored}`);
    console.log(`   Simulations: ${searchResult.statistics.totalSimulations}`);
    console.log(
      `   Agent usage:`,
      Object.fromEntries(searchResult.statistics.agentUsage)
    );
  } catch (error) {
    logger.error("Search failed", error);
  }

  // === Sentinel Agent Demo ===
  logger.info("=== Sentinel Agent Demo ===");

  const sentinelConfig = {
    diversityThreshold: 0.3,
    biasDetectionEnabled: true,
    correctionStrength: 0.2,
    analysisDepth: 3,
    learningEnabled: true,
    interventionThreshold: 0.6,
    maxCorrection: 0.1,
  };

  const sentinel = new SentinelAgent(sentinelConfig);

  // Create some mock evaluations with bias
  const biasedEvaluations = [
    {
      score: 0.8,
      confidence: 0.9,
      agentId: "aggressive",
      timestamp: Date.now(),
    },
    {
      score: 0.85,
      confidence: 0.95,
      agentId: "aggressive",
      timestamp: Date.now() + 1,
    },
    {
      score: 0.2,
      confidence: 0.7,
      agentId: "conservative",
      timestamp: Date.now() + 2,
    },
    {
      score: 0.15,
      confidence: 0.8,
      agentId: "conservative",
      timestamp: Date.now() + 3,
    },
    {
      score: 0.5,
      confidence: 0.6,
      agentId: "balanced",
      timestamp: Date.now() + 4,
    },
  ];

  const mockContext = {
    node: tree.getRoot(),
    children: [],
    depth: 1,
    history: biasedEvaluations as any,
  };

  logger.info("Running Sentinel analysis on biased evaluations...");

  const sentinelEvaluation = await sentinel.evaluate(mockContext as any);

  console.log(`🛡️ Sentinel Analysis Results:`);
  console.log(`   Bias detected: ${sentinelEvaluation.biasDetected}`);
  console.log(
    `   Diversity score: ${sentinelEvaluation.diversityScore.toFixed(3)}`
  );
  console.log(`   Confidence: ${sentinelEvaluation.confidence.toFixed(3)}`);
  console.log(
    `   Recommendations: ${sentinelEvaluation.recommendations.length} items`
  );

  if (sentinelEvaluation.biasReports.length > 0) {
    console.log(`   Detected biases:`);
    for (const bias of sentinelEvaluation.biasReports) {
      console.log(`     - ${bias.biasType}: ${bias.description}`);
      console.log(
        `       Severity: ${bias.severity.toFixed(3)}, Affected agents: ${bias.affectedAgents.join(", ")}`
      );
    }
  }

  // === Bias Detection Demo ===
  logger.info("=== Bias Detection Demo ===");

  const biasConfig = {
    minEvaluations: 3,
    systematicBiasThreshold: 0.3,
    temporalBiasThreshold: 0.4,
    positionalBiasThreshold: 0.3,
    detectConfirmationBias: true,
    detectAnchoringBias: true,
    temporalWindow: 5,
  };

  const biasDetector = new BiasDetector(biasConfig);

  const systematicBias = biasDetector.detectSystematicBias(
    biasedEvaluations as any
  );
  if (systematicBias) {
    console.log(`🔍 Systematic bias detected:`);
    console.log(`   Type: ${systematicBias.biasType}`);
    console.log(`   Severity: ${systematicBias.severity.toFixed(3)}`);
    console.log(`   Description: ${systematicBias.description}`);
  } else {
    console.log(`🔍 No systematic bias detected in sample`);
  }

  // === Diversity Analysis Demo ===
  logger.info("=== Diversity Analysis Demo ===");

  const diversityConfig = {
    minEvaluations: 2,
    lowDiversityThreshold: 0.3,
    groupthinkThreshold: 0.2,
    scoreWeight: 0.5,
    confidenceWeight: 0.3,
    reasoningWeight: 0.2,
  };

  const diversityAnalyzer = new DiversityAnalyzer(diversityConfig);
  const diversityAnalysis = diversityAnalyzer.analyzeDiversity(
    biasedEvaluations as any
  );

  console.log(`📊 Diversity Analysis:`);
  console.log(`   Overall score: ${diversityAnalysis.overallScore.toFixed(3)}`);
  console.log(`   Entropy: ${diversityAnalysis.entropy.toFixed(3)}`);
  console.log(`   Variance: ${diversityAnalysis.variance.toFixed(3)}`);
  console.log(
    `   Disagreement level: ${diversityAnalysis.disagreementLevel.toFixed(3)}`
  );
  console.log(
    `   Groupthink detected: ${diversityAnalysis.groupThinkDetected}`
  );
  console.log(`   Confidence: ${diversityAnalysis.confidence.toFixed(3)}`);

  // === Math Utilities Demo ===
  logger.info("=== Advanced Math Utilities Demo ===");

  const scores = [0.1, 0.8, 0.3, 0.9, 0.2, 0.7, 0.4];
  const weights = [1.0, 0.8, 1.2, 0.9, 1.1, 0.7, 1.0];

  console.log(`📐 Mathematical Analysis:`);
  console.log(
    `   Original scores: [${scores.map((s) => s.toFixed(1)).join(", ")}]`
  );
  console.log(
    `   Normalized: [${MathUtils.normalize(scores)
      .map((s) => s.toFixed(3))
      .join(", ")}]`
  );
  console.log(
    `   Softmax: [${MathUtils.softmax(scores)
      .map((s) => s.toFixed(3))
      .join(", ")}]`
  );
  console.log(
    `   Weighted average: ${MathUtils.weightedAverage(scores, weights).toFixed(3)}`
  );
  console.log(
    `   Standard deviation: ${MathUtils.standardDeviation(scores).toFixed(3)}`
  );
  console.log(
    `   Entropy: ${MathUtils.entropy(MathUtils.normalize(scores)).toFixed(3)}`
  );

  // === Framework Status ===
  logger.info("=== POLARIS Framework Status ===");

  console.log(`\n🎯 Current Implementation Status:`);
  console.log(`✅ Core Types & Interfaces - Complete`);
  console.log(`✅ Domain System Foundation - Complete`);
  console.log(`✅ Agent System Foundation - Complete`);
  console.log(`✅ MCTS Tree Structure - Complete`);
  console.log(`✅ Search Algorithms - Complete`);
  console.log(`✅ Sentinel Agent System - Complete`);
  console.log(`✅ Bias Detection - Complete`);
  console.log(`✅ Diversity Analysis - Complete`);
  console.log(`✅ Mathematical Utilities - Complete`);
  console.log(`⏳ POLARIS Engine - In Progress`);
  console.log(`⏳ Chess Domain - Planned`);
  console.log(`⏳ Web API Agents - Planned`);
  console.log(`⏳ Interactive Demos - Planned`);

  console.log(`\n🚀 Ready for:`);
  console.log(`   • Main POLARIS Engine implementation`);
  console.log(`   • Chess domain for concrete demonstrations`);
  console.log(`   • Web API agent integrations (OpenAI, Anthropic, etc.)`);
  console.log(`   • Advanced bias correction algorithms`);
  console.log(`   • Real-world problem domain applications`);

  logger.info("Enhanced POLARIS demonstration completed");
}

// Run the demo
runEnhancedDemo().catch(console.error);
