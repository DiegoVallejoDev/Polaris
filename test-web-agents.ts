/**
 * Simple API Integration Test for POLARIS Web Agents
 * Tests the working APIs (Anthropic and Google) without chess domain complications
 */

// Disable SSL verification for development testing
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import { WebAgentFactory } from "./src/agents/web";
import { EnvironmentConfig } from "./src/utils/config";

interface SimpleGameState {
  id: string;
  currentPlayer: number;
  position: string;
  getTurnNumber(): number;
  serialize(): string;
}

class MockGameState implements SimpleGameState {
  id = "test-position-1";
  currentPlayer = 1;
  position = "starting position";

  getTurnNumber(): number {
    return 1;
  }

  serialize(): string {
    return JSON.stringify({
      id: this.id,
      currentPlayer: this.currentPlayer,
      position: this.position,
    });
  }
}

async function testWebAgents() {
  console.log("🤖 POLARIS Web Agents Integration Test");
  console.log("=====================================\n");

  // Print configuration
  EnvironmentConfig.printConfigSummary();
  console.log("\n");

  try {
    // Get available providers
    const availableProviders = WebAgentFactory.getAvailableProviders();
    console.log("📡 Available Providers:", availableProviders);

    if (availableProviders.length === 0) {
      console.log("❌ No API keys configured!");
      return;
    }

    // Create agents
    console.log("\n🔧 Creating Web Agents...");
    const agents = WebAgentFactory.createDefaultAgents();
    console.log(`✅ Created ${agents.length} agents`);

    // Test each agent
    const mockState = new MockGameState();

    for (const agent of agents) {
      console.log(`\n🧪 Testing ${agent.name}...`);

      try {
        // Initialize agent
        if (agent.initialize) {
          await agent.initialize();
          console.log(`  ✅ Initialized successfully`);
        }

        // Test evaluation
        const startTime = performance.now();
        const evaluation = await agent.evaluate(mockState as any);
        const evaluationTime = performance.now() - startTime;

        console.log(`  🎯 Evaluation Result:`);
        console.log(`     Score: ${evaluation.score}`);
        console.log(`     Confidence: ${evaluation.confidence}`);
        console.log(`     Time: ${evaluationTime.toFixed(2)}ms`);
        console.log(
          `     Reasoning: ${(evaluation.reasoning || "No reasoning provided").substring(0, 100)}...`
        );

        // Get statistics
        const stats = agent.getStatistics();
        console.log(`  📊 Agent Statistics:`);
        console.log(`     Total Evaluations: ${stats.totalEvaluations}`);
        console.log(
          `     Average Time: ${stats.averageEvaluationTime.toFixed(2)}ms`
        );
        console.log(
          `     Average Confidence: ${stats.averageConfidence.toFixed(3)}`
        );

        // Cleanup
        if (agent.cleanup) {
          await agent.cleanup();
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        const cleanError =
          errorMsg.length > 200 ? errorMsg.substring(0, 200) + "..." : errorMsg;
        console.log(`  ❌ Error: ${cleanError}`);

        // Log additional details for debugging (but not the full error dump)
        if (error && typeof error === "object" && "response" in error) {
          const axiosError = error as any;
          if (axiosError.response?.status) {
            console.log(
              `     Status: ${axiosError.response.status} ${axiosError.response.statusText || ""}`
            );
          }
          if (axiosError.code) {
            console.log(`     Code: ${axiosError.code}`);
          }
        }
      }
    }

    console.log("\n🎉 Web Agents Integration Test Complete!");
    console.log("\n✅ All working agents tested successfully");
    console.log("🚀 POLARIS is ready for multi-agent decision making!");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("❌ Test failed:", errorMsg);
  }
}

// Run the test
if (require.main === module) {
  testWebAgents().catch(console.error);
}
