/**
 * Clean Console Output Test - Testing only working APIs
 * Demonstrates the improved, clean console output
 */

// Set environment to reduce verbosity
process.env.POLARIS_LOG_LEVEL = "info";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import { WebAgentFactory } from "./src/agents/web";

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

async function testCleanOutput() {
  console.log("✨ POLARIS Clean Console Output Demo");
  console.log("===================================\n");

  try {
    // Get available providers (exclude OpenAI to avoid rate limits)
    const availableProviders = WebAgentFactory.getAvailableProviders().filter(
      (provider) => provider !== "openai"
    );

    console.log("📡 Testing Providers:", availableProviders.join(", "));

    if (availableProviders.length === 0) {
      console.log("❌ No working API keys configured!");
      console.log(
        "💡 Please set up Anthropic or Google API keys in your .env file"
      );
      return;
    }

    // Create only working agents (skip OpenAI to avoid rate limits)
    const agents = WebAgentFactory.createDefaultAgents().filter((agent) => {
      const name = agent.name.toLowerCase();
      return !name.includes("openai") && !name.includes("gpt");
    });

    console.log(`✅ Created ${agents.length} working agents\n`);

    // Test each agent
    const mockState = new MockGameState();

    for (const agent of agents) {
      console.log(`🤖 Testing ${agent.name}...`);

      try {
        // Initialize
        if (agent.initialize) {
          await agent.initialize();
          console.log(`   ✅ Initialized`);
        }

        // Evaluate
        const startTime = performance.now();
        const evaluation = await agent.evaluate(mockState as any);
        const evaluationTime = performance.now() - startTime;

        console.log(
          `   🎯 Score: ${evaluation.score} | Confidence: ${evaluation.confidence}`
        );
        console.log(`   ⏱️  Time: ${evaluationTime.toFixed(0)}ms`);
        console.log(
          `   💭 Reasoning: ${(evaluation.reasoning || "").substring(0, 80)}...`
        );

        // Cleanup
        if (agent.cleanup) {
          await agent.cleanup();
        }

        console.log(`   🧹 Cleaned up\n`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.log(`   ❌ Error: ${errorMsg.substring(0, 100)}...`);

        if (error && typeof error === "object" && "response" in error) {
          const axiosError = error as any;
          if (axiosError.response?.status) {
            console.log(`   📊 Status: ${axiosError.response.status}`);
          }
        }
        console.log();
      }
    }

    console.log("🎉 Clean Console Output Demo Complete!");
    console.log("✨ Much cleaner and more readable output!");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("❌ Demo failed:", errorMsg);
  }
}

// Run the demo
if (require.main === module) {
  testCleanOutput().catch(console.error);
}
