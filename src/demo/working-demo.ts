/**
 * POLARIS Working Demo - Integrates full framework with LLM agents
 */

import { PolarisEngine } from "../core/engine";
import { WebAgentFactory } from "../agents/web";
import { ChessUtils, ChessState } from "../domains/chess";
import { EnvironmentConfig } from "../utils/config";
import { Logger } from "../utils/logger";
import { PolarisConfig } from "../types/config";

/**
 * Demo configuration
 */
interface DemoConfig {
  useRealAgents: boolean;
  maxSearchDepth: number;
  timeLimit: number;
  showThinking: boolean;
  autoPlay: boolean;
}

/**
 * Main demo class that showcases POLARIS capabilities
 */
export class PolarisDemo {
  private engine: PolarisEngine | null = null;
  private logger: Logger;
  private config: DemoConfig;

  constructor(config: Partial<DemoConfig> = {}) {
    this.config = {
      useRealAgents: true,
      maxSearchDepth: 5,
      timeLimit: 10000, // 10 seconds
      showThinking: true,
      autoPlay: false,
      ...config,
    };

    this.logger = new Logger("PolarisDemo", EnvironmentConfig.POLARIS.logLevel);
  }

  /**
   * Initialize the demo with POLARIS engine and agents
   */
  async initialize(): Promise<void> {
    this.logger.info("🚀 Initializing POLARIS Demo...");

    try {
      // Create POLARIS configuration
      const polarisConfig: PolarisConfig = {
        search: {
          maxDepth: this.config.maxSearchDepth,
          timeLimit: this.config.timeLimit,
          explorationConstant: EnvironmentConfig.POLARIS.explorationConstant,
          simulationsPerNode: EnvironmentConfig.POLARIS.simulationsPerNode,
          parallelism: 1,
          progressiveWidening: true,
        },
        agents: [],
        sentinel: {
          diversityThreshold: EnvironmentConfig.POLARIS.diversityThreshold,
          biasDetectionEnabled: true,
          correctionStrength: EnvironmentConfig.POLARIS.correctionStrength,
          analysisDepth: 3,
          interventionThreshold:
            EnvironmentConfig.POLARIS.interventionThreshold,
        },
      };

      // Create engine
      this.engine = new PolarisEngine(polarisConfig);

      // Add agents based on configuration
      if (this.config.useRealAgents) {
        await this.setupRealAgents();
      } else {
        await this.setupMockAgents();
      }

      this.logger.info("✅ POLARIS Demo initialized successfully");
    } catch (error) {
      this.logger.error("❌ Failed to initialize POLARIS Demo", error);
      throw error;
    }
  }

  /**
   * Run a complete chess analysis demonstration
   */
  async runChessAnalysis(): Promise<void> {
    if (!this.engine) {
      throw new Error("Demo not initialized. Call initialize() first.");
    }

    this.logger.info("🏁 Starting POLARIS Chess Analysis Demo");

    try {
      // Create initial chess state
      const initialState = ChessUtils.createInitialState();

      this.logger.info("📋 Initial Position:", {
        fen: initialState.getFEN(),
        currentPlayer: initialState.currentPlayer,
        gameStatus: initialState.getGameStatus(),
      });

      if (this.config.showThinking) {
        this.logger.info("🤔 POLARIS is analyzing the position...");
      }

      // Run POLARIS search
      const startTime = performance.now();
      const result = await this.engine.search(initialState);
      const analysisTime = performance.now() - startTime;

      // Display results
      this.logger.info("🎯 POLARIS Analysis Complete!", {
        analysisTimeMs: Math.round(analysisTime),
        bestAction: result.bestAction?.toString() || "No action found",
        confidence: result.confidence,
        nodesExplored: result.statistics.nodesExplored,
        totalSimulations: result.statistics.totalSimulations,
        searchTime: result.statistics.searchTime,
      });

      // Show agent performance breakdown
      this.showAgentPerformance(result.agentPerformance);

      // Show sentinel analysis
      if (result.sentinelAnalysis) {
        this.logger.info("🛡️ Sentinel Analysis:", result.sentinelAnalysis);
      }

      // Show memory usage
      this.logger.info("💾 Memory Usage:", result.memoryUsage);

      // Auto-play demo
      if (this.config.autoPlay) {
        await this.runAutoPlayDemo(initialState);
      }
    } catch (error) {
      this.logger.error("❌ Chess analysis failed", error);
      throw error;
    }
  }

  /**
   * Run API connectivity test
   */
  async testAPIConnectivity(): Promise<void> {
    this.logger.info("🔌 Testing API Connectivity...");

    const providers = WebAgentFactory.getAvailableProviders();

    this.logger.info("📡 Available Providers:", providers);

    for (const provider of providers) {
      try {
        const agent = WebAgentFactory.createAgent({
          provider: provider as any,
          name: `Test-${provider}`,
        });

        if (agent.initialize) {
          await agent.initialize();
        }

        this.logger.info(`✅ ${provider} API: Connected`);

        if (agent.cleanup) {
          await agent.cleanup();
        }
      } catch (error) {
        this.logger.warn(`⚠️ ${provider} API: Connection failed`, error);
      }
    }
  }

  /**
   * Get demo statistics
   */
  getStatistics(): Record<string, any> {
    if (!this.engine) {
      return { error: "Engine not initialized" };
    }

    return {
      engineStatistics: this.engine.getStatistics(),
      agentCount: this.engine.getAgents().length,
      config: this.config,
      environment: {
        logLevel: EnvironmentConfig.POLARIS.logLevel,
        maxMemory: EnvironmentConfig.POLARIS.maxMemory,
        diversityThreshold: EnvironmentConfig.POLARIS.diversityThreshold,
      },
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.engine) {
      await this.engine.cleanup();
      this.engine = null;
    }
    this.logger.info("🧹 Demo cleanup completed");
  }

  // Private helper methods

  private async setupRealAgents(): Promise<void> {
    if (!this.engine) return;

    const availableProviders = WebAgentFactory.getAvailableProviders();

    if (availableProviders.length === 0) {
      throw new Error("No API keys configured. Please check your .env file.");
    }

    this.logger.info("🤖 Setting up LLM agents:", availableProviders);

    try {
      const agents = WebAgentFactory.createDefaultAgents();

      for (const agent of agents) {
        if (agent.initialize) {
          await agent.initialize();
        }
        this.engine.addAgent(agent);
        this.logger.info(`✅ Added agent: ${agent.name}`);
      }
    } catch (error) {
      this.logger.error("Failed to setup real agents", error);
      throw error;
    }
  }

  private async setupMockAgents(): Promise<void> {
    // For now, log that mock agents would be created
    // In a full implementation, we would create simple heuristic agents
    this.logger.info(
      "🎭 Mock agents would be created here (not implemented yet)"
    );
  }

  private showAgentPerformance(agentPerformance: Map<string, any>): void {
    this.logger.info("📊 Agent Performance Breakdown:");

    for (const [agentId, performance] of agentPerformance.entries()) {
      this.logger.info(`  ${agentId}:`, {
        evaluations: performance.totalEvaluations,
        avgTime: `${performance.averageEvaluationTime.toFixed(2)}ms`,
        avgConfidence: performance.averageConfidence.toFixed(3),
        successRate: `${(performance.successRate * 100).toFixed(1)}%`,
        contribution: performance.contributionScore.toFixed(3),
      });
    }
  }

  private async runAutoPlayDemo(initialState: ChessState): Promise<void> {
    this.logger.info("🎮 Starting Auto-Play Demo...");

    let currentState = initialState;
    let moveCount = 0;
    const maxMoves = 10;

    while (!currentState.isTerminal && moveCount < maxMoves) {
      this.logger.info(`\n🎯 Move ${moveCount + 1}:`);

      const result = await this.engine!.search(currentState);

      if (!result.bestAction) {
        this.logger.warn("No best action found, stopping auto-play");
        break;
      }

      this.logger.info(`Selected: ${result.bestAction.toString()}`);

      // Apply the action
      try {
        currentState = currentState.applyAction(result.bestAction as any);
        moveCount++;

        this.logger.info(`New position: ${currentState.getFEN()}`);
      } catch (error) {
        this.logger.error("Failed to apply action", error);
        break;
      }

      // Small delay for demonstration
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    this.logger.info(`🏁 Auto-play completed after ${moveCount} moves`);
  }
}

/**
 * Main demo runner function
 */
export async function runPolarisDemo(): Promise<void> {
  // Print environment configuration
  EnvironmentConfig.printConfigSummary();

  const demo = new PolarisDemo({
    useRealAgents: true,
    maxSearchDepth: 3,
    timeLimit: 5000,
    showThinking: true,
    autoPlay: false,
  });

  try {
    // Initialize demo
    await demo.initialize();

    // Test API connectivity
    await demo.testAPIConnectivity();

    // Run chess analysis
    await demo.runChessAnalysis();

    // Show final statistics
    console.log("\n📊 Final Statistics:");
    console.log(JSON.stringify(demo.getStatistics(), null, 2));
  } catch (error) {
    console.error("❌ Demo failed:", error);
  } finally {
    // Cleanup
    await demo.cleanup();
  }
}

// If running directly
if (require.main === module) {
  runPolarisDemo().catch(console.error);
}
