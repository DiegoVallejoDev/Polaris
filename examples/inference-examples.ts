/**
 * Example showing how to perform inference with the refactored POLARIS engine
 * Demonstrates the new unified inference API and agent outputs
 */

import {
  PolarisEngine,
  TaskBuilder,
  CommonDomains,
  QuickAgents,
  PresetLoader,
  AgentOutputUtils,
  BaseGameState,
  BaseAction,
} from "../src/index";

// Example game state for demonstration
class ExampleGameState extends BaseGameState {
  constructor(
    public boardState: string,
    public override currentPlayer: number,
    public moveCount: number
  ) {
    super(`game_${Date.now()}`, currentPlayer, false);
  }

  serialize(): any {
    return {
      boardState: this.boardState,
      currentPlayer: this.currentPlayer,
      moveCount: this.moveCount,
    };
  }

  clone(): ExampleGameState {
    return new ExampleGameState(
      this.boardState,
      this.currentPlayer,
      this.moveCount
    );
  }

  getTurnNumber(): number {
    return this.moveCount;
  }

  applyAction(_action: any): ExampleGameState {
    return new ExampleGameState(
      `${this.boardState}_action`,
      this.currentPlayer === 0 ? 1 : 0,
      this.moveCount + 1
    );
  }

  getValidActions(): any[] {
    return [];
  }

  getFeatures(): number[] {
    return [this.moveCount, this.currentPlayer];
  }

  getHashKey(): string {
    return `${this.boardState}_${this.currentPlayer}_${this.moveCount}`;
  }

  getGameInfo(): any {
    return {
      boardState: this.boardState,
      moveCount: this.moveCount,
    };
  }
}

// Example action for demonstration
class ExampleAction extends BaseAction {
  constructor(
    public move: string,
    public from: string,
    public to: string
  ) {
    super(`${from}-${to}`, move, "1.0");
  }

  execute(_state: ExampleGameState): ExampleGameState {
    // Implementation would update the game state
    return new ExampleGameState(
      `${_state.boardState}_${this.move}`,
      _state.currentPlayer === 0 ? 1 : 0,
      _state.moveCount + 1
    );
  }

  override toString(): string {
    return `${this.move}: ${this.from} -> ${this.to}`;
  }

  isValid(): boolean {
    return true;
  }

  getCost(): number {
    return 1.0;
  }

  getMetadata(): any {
    return {
      move: this.move,
      from: this.from,
      to: this.to,
    };
  }

  serialize(): any {
    return {
      move: this.move,
      from: this.from,
      to: this.to,
    };
  }

  deserialize(_data: any): ExampleAction {
    return new ExampleAction(_data.move, _data.from, _data.to);
  }

  equals(other: any): boolean {
    return (
      other instanceof ExampleAction &&
      this.move === other.move &&
      this.from === other.from &&
      this.to === other.to
    );
  }

  getHashKey(): string {
    return `${this.move}_${this.from}_${this.to}`;
  }
}

// Example 1: Basic Inference
async function basicInferenceExample() {
  console.log("=== Basic Inference Example ===");

  // Create a simple task
  const task = TaskBuilder.create("chess-move-analysis", "Chess Move Analysis")
    .description("Analyze chess positions and evaluate potential moves")
    .domain(CommonDomains.CHESS)
    .commonRoles(["ANALYST", "RISKY", "CONSERVATIVE"])
    .goals("Find the best chess move in the current position")
    .build();

  // Create agents using QuickAgents
  const agents = [
    QuickAgents.gpt4oMini(task.roles.ANALYST, task, process.env.OPENAI_API_KEY),
    QuickAgents.claudeHaiku(
      task.roles.RISKY,
      task,
      process.env.ANTHROPIC_API_KEY
    ),
    QuickAgents.geminiFlash(
      task.roles.CONSERVATIVE,
      task,
      process.env.GOOGLE_API_KEY
    ),
  ];

  // Create engine
  const engine = new PolarisEngine({
    task,
    agents,
    engineConfig: {
      parallel: true,
      timeLimit: 15000,
    },
  });

  // Create example game state
  const gameState = new ExampleGameState(
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR",
    0, // 0 for white, 1 for black
    1
  );

  // Create example actions
  const actions = [
    new ExampleAction("Pawn to e4", "e2", "e4"),
    new ExampleAction("Pawn to d4", "d2", "d4"),
    new ExampleAction("Knight to f3", "g1", "f3"),
  ];

  try {
    // Perform inference
    console.log("Running inference...");
    const result = await engine.inference({
      state: gameState,
      actions,
      context: {
        gameType: "chess",
        difficulty: "beginner",
      },
    });

    // Analyze results
    console.log("\n--- Inference Results ---");
    console.log("Session ID:", result.session.sessionId);
    console.log(
      "Total processing time:",
      result.engineStatistics.totalInferenceTime,
      "ms"
    );
    console.log("Agents used:", result.agentOutputs.length);
    console.log(
      "Successful agents:",
      result.agentOutputs.filter((o) => !o.error?.hasError).length
    );

    // Show individual agent outputs
    console.log("\n--- Agent Outputs ---");
    for (const output of result.agentOutputs) {
      console.log(`\n${output.agentName} (${output.providerType}):`);
      console.log(`  Role: ${output.role}`);
      console.log(`  Score: ${output.evaluation.score.toFixed(3)}`);
      console.log(`  Confidence: ${output.evaluation.confidence.toFixed(3)}`);
      console.log(
        `  Reasoning: ${output.evaluation.reasoning?.substring(0, 100)}...`
      );

      if (output.error?.hasError) {
        console.log(`  Error: ${output.error.message}`);
      }

      if (output.processing) {
        console.log(`  Processing time: ${output.processing.processingTime}ms`);
        console.log(`  Tokens used: ${output.processing.tokensUsed || "N/A"}`);
      }
    }

    // Show aggregated metrics
    console.log("\n--- Aggregated Metrics ---");
    const successfulOutputs = result.agentOutputs.filter(
      (o) => !o.error?.hasError
    );
    if (successfulOutputs.length > 0) {
      console.log(
        "Average confidence:",
        AgentOutputUtils.calculateAverageConfidence(successfulOutputs).toFixed(
          3
        )
      );
      console.log(
        "Score variance:",
        AgentOutputUtils.calculateScoreVariance(successfulOutputs).toFixed(3)
      );

      const highestConfidence =
        AgentOutputUtils.findHighestConfidence(successfulOutputs);
      if (highestConfidence) {
        console.log("Highest confidence agent:", highestConfidence.agentName);
      }
    }

    // Show recommendation
    if (result.recommendation) {
      console.log("\n--- Engine Recommendation ---");
      console.log(
        "Recommended action:",
        result.recommendation.action.toString()
      );
      console.log("Confidence:", result.recommendation.confidence.toFixed(3));
      console.log("Reasoning:", result.recommendation.reasoning);
    }

    // Show sentinel analysis
    if (result.sentinelAnalysis) {
      console.log("\n--- Sentinel Analysis ---");
      console.log(
        "Diversity score:",
        result.sentinelAnalysis.diversityScore.toFixed(3)
      );
      console.log(
        "Quality score:",
        result.sentinelAnalysis.qualityScore.toFixed(3)
      );
      console.log("Bias detected:", result.sentinelAnalysis.biasDetected);
      console.log(
        "Recommendations:",
        result.sentinelAnalysis.recommendations?.join(", ")
      );
    }
  } catch (error) {
    console.error("Inference failed:", error);
  } finally {
    await engine.cleanup();
  }
}

// Example 2: Advanced Inference with Configuration Override
async function advancedInferenceExample() {
  console.log("\n=== Advanced Inference Example ===");

  // Load a preset
  const preset = PresetLoader.getPreset("philosophical-debate");
  if (!preset) {
    console.log("Preset not found");
    return;
  }

  // Create minimal agents for demo (without API keys)
  const agents = preset.agents.slice(0, 2).map((agentConfig) => {
    const role = preset.task.roles[agentConfig.roleId];
    return QuickAgents.gpt4oMini(role, preset.task); // No API key for demo
  });

  const engineConfig: any = {
    task: preset.task,
    agents,
  };

  if (preset.engineConfig) {
    engineConfig.engineConfig = preset.engineConfig;
  }

  const engine = new PolarisEngine(engineConfig);

  // Create a philosophical question as game state
  const philosophicalState = new ExampleGameState(
    "What is the nature of consciousness?",
    0, // Current "player" (perspective)
    1
  );

  try {
    // Run inference with configuration override
    console.log("Running advanced inference...");
    const result = await engine.inference({
      state: philosophicalState,
      configOverride: {
        timeLimit: 10000, // Override time limit
        parallel: false, // Override parallelism
        diversityThreshold: 0.5,
      },
      context: {
        topic: "consciousness",
        domain: "philosophy",
        complexity: "high",
      },
    });

    console.log("\n--- Advanced Results ---");
    console.log(
      "Configuration used parallel execution:",
      result.engineStatistics.coordinationStats?.parallelExecution
        ? "Yes"
        : "No"
    );
    console.log(
      "Total inference time:",
      result.engineStatistics.totalInferenceTime,
      "ms"
    );

    // Demonstrate agent output utilities
    const outputs = result.agentOutputs;
    console.log("\n--- Agent Output Analysis ---");
    console.log("Total outputs:", outputs.length);
    console.log("Has errors:", AgentOutputUtils.hasErrors(outputs));
    console.log(
      "Successful outputs:",
      AgentOutputUtils.getSuccessfulOutputs(outputs).length
    );

    // Group by provider
    const byProvider = AgentOutputUtils.groupByProvider(outputs);
    console.log("Outputs by provider:");
    Object.entries(byProvider).forEach(([provider, providerOutputs]) => {
      console.log(`  ${provider}: ${providerOutputs.length} outputs`);
    });
  } catch (error) {
    console.error("Advanced inference failed:", error);
  } finally {
    await engine.cleanup();
  }
}

// Example 3: Selective Agent Inference
async function selectiveInferenceExample() {
  console.log("\n=== Selective Agent Inference Example ===");

  // Create task with multiple roles
  const task = TaskBuilder.create(
    "multi-perspective-analysis",
    "Multi-Perspective Analysis"
  )
    .description("Analyze from multiple viewpoints")
    .commonDomain("GENERAL")
    .commonRoles([
      "ANALYST",
      "RISKY",
      "CONSERVATIVE",
      "QUESTIONING",
      "EXPLORER",
    ])
    .goals("Comprehensive multi-perspective analysis")
    .build();

  // Create many agents
  const agents = [
    QuickAgents.gpt4oMini(task.roles.ANALYST, task),
    QuickAgents.gpt4oMini(task.roles.RISKY, task),
    QuickAgents.gpt4oMini(task.roles.CONSERVATIVE, task),
    QuickAgents.gpt4oMini(task.roles.QUESTIONING, task),
    QuickAgents.gpt4oMini(task.roles.EXPLORER, task),
  ];

  const engine = new PolarisEngine({
    task,
    agents,
  });

  const analysisState = new ExampleGameState(
    "Market analysis for new product launch",
    0,
    1
  );

  try {
    // First, run with all agents
    console.log("Running with all agents...");
    const fullResult = await engine.inference({
      state: analysisState,
    });
    console.log("Full analysis used", fullResult.agentOutputs.length, "agents");

    // Then, run with only specific agents
    const specificAgentIds = [agents[0].id, agents[2].id]; // Analyst and Conservative only
    console.log("\nRunning with selected agents only...");
    const selectiveResult = await engine.inference({
      state: analysisState,
      agentIds: specificAgentIds,
    });
    console.log(
      "Selective analysis used",
      selectiveResult.agentOutputs.length,
      "agents"
    );

    // Compare results
    console.log("\n--- Comparison ---");
    console.log(
      "Full analysis avg confidence:",
      AgentOutputUtils.calculateAverageConfidence(
        fullResult.agentOutputs
      ).toFixed(3)
    );
    console.log(
      "Selective analysis avg confidence:",
      AgentOutputUtils.calculateAverageConfidence(
        selectiveResult.agentOutputs
      ).toFixed(3)
    );
  } catch (error) {
    console.error("Selective inference failed:", error);
  } finally {
    await engine.cleanup();
  }
}

// Run all examples
async function runInferenceExamples() {
  try {
    await basicInferenceExample();
    await advancedInferenceExample();
    await selectiveInferenceExample();

    console.log("\n=== All Inference Examples Completed ===");
  } catch (error) {
    console.error("Inference examples failed:", error);
  }
}

// Export for use in other examples
export {
  basicInferenceExample,
  advancedInferenceExample,
  selectiveInferenceExample,
  ExampleGameState,
  ExampleAction,
};

// Run if this file is executed directly
if (require.main === module) {
  runInferenceExamples();
}
