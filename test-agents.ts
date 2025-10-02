/**
 * POLARIS Agent Test
 * Tests all available web agents
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import { EnvironmentConfig } from "./src/utils/config";
import {
  OpenAIAgent,
  DEFAULT_OPENAI_MODEL,
  DEFAULT_OPENAI_NAME,
} from "./src/agents/web/openai-agent";
import {
  AnthropicAgent,
  DEFAULT_ANTHROPIC_MODEL,
  DEFAULT_ANTHROPIC_NAME,
} from "./src/agents/web/anthropic-agent";
import {
  GoogleAgent,
  DEFAULT_GOOGLE_MODEL,
  DEFAULT_GOOGLE_NAME,
} from "./src/agents/web/google-agent";

class MockGameState {
  id = "test-position";
  currentPlayer = 1;
  position = "starting position";
  getTurnNumber() {
    return 1;
  }
  serialize() {
    return JSON.stringify({ id: this.id, currentPlayer: this.currentPlayer });
  }
}

function createAgents() {
  const agents: any[] = [];

  if (EnvironmentConfig.ANTHROPIC.apiKey) {
    agents.push(
      new AnthropicAgent({
        id: "anthropic",
        name: DEFAULT_ANTHROPIC_NAME,
        provider: "anthropic" as const,
        apiKey: EnvironmentConfig.ANTHROPIC.apiKey,
        model: DEFAULT_ANTHROPIC_MODEL,
        maxTokens: 500,
      })
    );
  }

  if (EnvironmentConfig.GOOGLE.apiKey) {
    agents.push(
      new GoogleAgent({
        id: "google",
        name: DEFAULT_GOOGLE_NAME,
        provider: "google" as const,
        apiKey: EnvironmentConfig.GOOGLE.apiKey,
        model: DEFAULT_GOOGLE_MODEL,
        maxTokens: 500,
      })
    );
  }

  if (EnvironmentConfig.OPENAI.apiKey) {
    agents.push(
      new OpenAIAgent({
        id: "openai",
        name: DEFAULT_OPENAI_NAME,
        provider: "openai" as const,
        apiKey: EnvironmentConfig.OPENAI.apiKey,
        model: DEFAULT_OPENAI_MODEL,
        temperature: 0.7,
        maxTokens: 300,
      })
    );
  }

  return agents;
}

export async function testAgents() {
  console.log("🤖 POLARIS Agent Test\n");

  const agents = createAgents();
  if (agents.length === 0) {
    console.log("❌ No API keys configured");
    return;
  }

  console.log(`Testing ${agents.length} agents...\n`);
  const state = new MockGameState();

  for (const agent of agents) {
    console.log(`🧪 ${agent.name}:`);

    try {
      await agent.initialize?.();
      const start = performance.now();
      const evaluation = await agent.evaluate(state as any);
      const time = performance.now() - start;

      console.log(
        `  ✅ Score: ${evaluation.score}, Confidence: ${evaluation.confidence}, Time: ${time.toFixed(0)}ms`
      );

      if (evaluation.metadata?.fallback) {
        console.log(`  ⚠️  Fallback result (likely rate limited)`);
      }

      await agent.cleanup?.();
    } catch (error: any) {
      console.log(`  ❌ ${error.message}`);
    }
  }

  console.log("\n🎉 Test complete!");
}

if (require.main === module) {
  testAgents().catch(console.error);
}
