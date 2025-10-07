/**
 * Basic usage example for the refactored POLARIS engine
 * Shows how to use the new ergonomic agent creation and unified interface
 */

import {
  PolarisEngine,
  TaskBuilder,
  openAiAgent,
  anthropicAgent,
  googleAgent,
  quickStart,
} from "../src/index";

// Example 1: Quick Start for common use cases
async function quickStartExample() {
  console.log("=== Quick Start Example ===");

  // Get quick start configuration for chess analysis
  const { preset, createEngine } = quickStart("chess");

  console.log("Using preset:", preset.name);
  console.log("Task:", preset.task.name);

  // Create engine with API keys
  const apiKeys: any = {};
  if (process.env.OPENAI_API_KEY) apiKeys.openai = process.env.OPENAI_API_KEY;
  if (process.env.ANTHROPIC_API_KEY)
    apiKeys.anthropic = process.env.ANTHROPIC_API_KEY;
  if (process.env.GOOGLE_API_KEY) apiKeys.google = process.env.GOOGLE_API_KEY;

  const engine = createEngine(apiKeys);

  console.log("Engine created with", engine.getAgents().length, "agents");

  // Clean up
  await engine.cleanup();
}

// Example 2: Custom Task and Agent Creation
async function customTaskExample() {
  console.log("\n=== Custom Task Example ===");

  // Create a custom task
  const customTask = TaskBuilder.create(
    "strategy-analysis",
    "Business Strategy Analysis"
  )
    .description("Analyze business strategies from multiple perspectives")
    .commonDomain("GENERAL")
    .commonRoles(["ANALYST", "RISKY", "CONSERVATIVE"])
    .goals(
      "Provide comprehensive business strategy analysis",
      ["Identify opportunities", "Assess risks", "Recommend actions"],
      ["Actionable insights", "Risk assessment", "Clear recommendations"]
    )
    .config({
      evaluationCriteria: [
        "market_opportunity",
        "risk_level",
        "implementation_feasibility",
      ],
      scoringMethod: "consensus",
    })
    .build();

  console.log("Created task:", customTask.name);
  console.log("Available roles:", Object.keys(customTask.roles));

  // Create agents with ergonomic factory functions
  const agents = [];

  // OpenAI agent
  const openaiConfig: any = {
    role: customTask.roles.ANALYST,
    task: customTask,
    model: "gpt-4o",
  };
  if (process.env.OPENAI_API_KEY)
    openaiConfig.apiKey = process.env.OPENAI_API_KEY;
  agents.push(openAiAgent(openaiConfig));

  // Anthropic agent
  const anthropicConfig: any = {
    role: customTask.roles.RISKY,
    task: customTask,
    model: "claude-3-5-sonnet-20241022",
    temperature: 0.8,
  };
  if (process.env.ANTHROPIC_API_KEY)
    anthropicConfig.apiKey = process.env.ANTHROPIC_API_KEY;
  agents.push(anthropicAgent(anthropicConfig));

  // Google agent
  const googleConfig: any = {
    role: customTask.roles.CONSERVATIVE,
    task: customTask,
    model: "gemini-1.5-pro",
    temperature: 0.3,
  };
  if (process.env.GOOGLE_API_KEY)
    googleConfig.apiKey = process.env.GOOGLE_API_KEY;
  agents.push(googleAgent(googleConfig));

  console.log("Created", agents.length, "agents");

  // Create and configure engine
  const engine = new PolarisEngine({
    task: customTask,
    agents,
    engineConfig: {
      maxIterations: 100,
      timeLimit: 30000,
      diversityThreshold: 0.3,
      consensusThreshold: 0.7,
      parallel: true,
    },
  });

  console.log("Engine session ID:", engine.getSessionId());

  // Clean up
  await engine.cleanup();
}

// Example 3: Using Configuration Presets
async function presetExample() {
  console.log("\n=== Configuration Preset Example ===");

  const { PresetLoader, createAgent, PolarisEngine } = await import(
    "../src/index"
  );

  // Get a preset
  const preset = PresetLoader.getPreset("philosophical-debate");
  if (!preset) {
    console.log("Preset not found");
    return;
  }

  console.log("Using preset:", preset.name);
  console.log("Description:", preset.description);

  // Create agents from preset configuration
  const agents = preset.agents.map((agentConfig) => {
    const role = preset.task.roles[agentConfig.roleId];
    const config: any = {
      role,
      task: preset.task,
      model: agentConfig.model,
    };

    if (agentConfig.name) config.name = agentConfig.name;
    if (agentConfig.maxTokens) config.maxTokens = agentConfig.maxTokens;
    if (agentConfig.temperature) config.temperature = agentConfig.temperature;
    // API keys would be provided here

    return createAgent(agentConfig.provider, config);
  });

  console.log("Created", agents.length, "agents from preset");

  // Create engine
  const engineConfig: any = {
    task: preset.task,
    agents,
  };

  if (preset.engineConfig) {
    engineConfig.engineConfig = preset.engineConfig;
  }

  const engine = new PolarisEngine(engineConfig);

  console.log("Engine configured with preset settings");

  // Clean up
  await engine.cleanup();
}

// Example 4: Agent Ensemble Building
async function ensembleExample() {
  console.log("\n=== Agent Ensemble Example ===");

  const { createEnsemble, TaskBuilder, AgentProvider } = await import(
    "../src/index"
  );

  // Create a task
  const task = TaskBuilder.create(
    "competitive-analysis",
    "Competitive Game Analysis"
  )
    .description("Multi-agent competitive game analysis")
    .commonDomain("GENERAL")
    .commonRoles(["ANALYST", "RISKY", "CONSERVATIVE", "EXPLORER"])
    .goals("Win the game through strategic analysis")
    .build();

  // Build diverse agent ensemble
  const agents = createEnsemble(task)
    .add(AgentProvider.OPENAI, task.roles.ANALYST, "gpt-4o")
    .addDiverseRole(task.roles.RISKY, [
      {
        provider: AgentProvider.ANTHROPIC,
        model: "claude-3-5-sonnet-20241022",
      },
      { provider: AgentProvider.GOOGLE, model: "gemini-1.5-pro" },
    ])
    .addRoles(AgentProvider.OPENAI, "gpt-4o-mini", [
      task.roles.CONSERVATIVE,
      task.roles.EXPLORER,
    ])
    .build();

  console.log("Built ensemble with", agents.length, "agents");
  console.log(
    "Agent types:",
    agents.map((a) => `${a.name} (${a.type})`)
  );

  // Create engine
  const engine = new PolarisEngine({
    task,
    agents,
    engineConfig: {
      parallel: true,
      diversityThreshold: 0.4,
    },
  });

  console.log("Ensemble engine ready");

  // Clean up
  await engine.cleanup();
}

// Run examples
async function runExamples() {
  try {
    await quickStartExample();
    await customTaskExample();
    await presetExample();
    await ensembleExample();

    console.log("\n=== All Examples Completed ===");
  } catch (error) {
    console.error("Example failed:", error);
  }
}

// Export for use in other examples
export { quickStartExample, customTaskExample, presetExample, ensembleExample };

// Run if this file is executed directly
if (require.main === module) {
  runExamples();
}
