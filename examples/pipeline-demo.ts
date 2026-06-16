/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * POLARIS CREATIVA — Pipeline Mode Demo
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This demo showcases the 4-layer creative pipeline (Polaris Creativa):
 *
 *   Layer 1: DIVERGENT  — Multiple agents brainstorm in parallel (high temperature)
 *   Layer 2: INQUISITOR — Filters explorations for logical coherence (low temperature)
 *   Layer 3: SYNTHESIZER — Weaves validated fragments into a draft (medium temperature)
 *   Layer 4: ORCHESTRATOR — Quality gate: deliver or rerun with corrections (low temperature)
 *
 * The pipeline uses a DECAY LOOP: if the Orchestrator rejects the draft,
 * it re-enters Layer 1 with accumulated correction feedback and progressively
 * higher temperatures until delivery or budget exhaustion.
 *
 * Requirements:
 *   - OPENAI_API_KEY in .env (pipeline currently requires OpenAI for Structured Outputs)
 *
 * Run:
 *   pnpm run demo:pipeline
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  PolarisEngine,
  PolarisEngineConfig,
  TaskBuilder,
  OpenAIStrategyAgent,
  DivergentPromptStrategy,
  DivergentOutputParser,
  InquisitorPromptStrategy,
  InquisitorOutputParser,
  SynthesizerPromptStrategy,
  SynthesizerOutputParser,
  OrchestratorPromptStrategy,
  OrchestratorOutputParser,
  INQUISITOR_SCHEMA,
  ORCHESTRATOR_SCHEMA,
  BaseGameState,
  BaseAction,
  openAiAgent,
} from "../src/index";
import type { LayerPipelineConfig } from "../src/engine/layer-pipeline";
import type { DecayConfig } from "../src/types/layer";
import type { Action } from "../src/domains/base/action";

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: Domain Setup
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * A simple state that carries a creative prompt for the pipeline to elaborate on.
 * In real usage, this could be a game board, a conversation history, a document, etc.
 */
class CreativeState extends BaseGameState {
  public readonly prompt: string;
  public readonly constraints: string[];

  constructor(prompt: string, constraints: string[] = []) {
    super(`creative-${Date.now()}`, 1, false);
    this.prompt = prompt;
    this.constraints = constraints;
  }

  serialize(): any {
    return { prompt: this.prompt, constraints: this.constraints };
  }

  clone(): CreativeState {
    return new CreativeState(this.prompt, [...this.constraints]);
  }

  applyAction(_action: Action): CreativeState {
    return this.clone();
  }

  getValidActions(): Action[] {
    return [];
  }

  getFeatures(): number[] {
    return [this.prompt.length];
  }

  getHashKey(): string {
    return `creative_${this.prompt.substring(0, 20)}`;
  }

  getTurnNumber(): number {
    return 1;
  }

  getGameInfo(): Record<string, any> {
    return { prompt: this.prompt, constraints: this.constraints };
  }
}

class NoAction extends BaseAction {
  constructor() {
    super("none", "no-op", "No action needed");
  }

  isValid(): boolean {
    return true;
  }

  getCost(): number {
    return 0;
  }

  getMetadata(): Record<string, any> {
    return {};
  }

  serialize(): string {
    return JSON.stringify({ id: "none" });
  }

  getHashKey(): string {
    return "no-action";
  }

  equals(other: Action): boolean {
    return other.id === "none";
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: Task & Role Definition
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Define the creative task. The TaskBuilder provides a fluent API for configuration.
 */
function buildCreativeTask() {
  return TaskBuilder.create("creative-writing", "Creative Writing Pipeline")
    .description(
      "Generate high-quality creative content through multi-agent collaboration " +
        "using the Polaris Creativa 4-layer pipeline."
    )
    .commonDomain("GENERAL")
    .roles({
      explorer_a: {
        id: "explorer_a",
        name: "Imaginative Explorer",
        goal: "Generate bold, unconventional ideas",
        instructions:
          "Think laterally. Propose ideas that challenge assumptions. " +
          "Be creative and surprising — quality over safety.",
        perspective: "Creative visionary",
        bias: "exploratory",
      },
      explorer_b: {
        id: "explorer_b",
        name: "Analytical Explorer",
        goal: "Generate structured, well-reasoned ideas",
        instructions:
          "Build ideas systematically. Ground creativity in logic. " +
          "Propose ideas that are both novel and implementable.",
        perspective: "Structured thinker",
        bias: "balanced",
      },
      explorer_c: {
        id: "explorer_c",
        name: "Empathetic Explorer",
        goal: "Generate ideas focused on human impact",
        instructions:
          "Center every idea around people. Consider emotional resonance, " +
          "accessibility, and real-world impact on diverse audiences.",
        perspective: "Human-centered designer",
        bias: "conservative",
      },
      critic: {
        id: "critic",
        name: "Logical Critic",
        goal: "Filter ideas for coherence and feasibility",
        instructions:
          "Evaluate each exploration for logical consistency, coherence, " +
          "and alignment with the original prompt. Be rigorous but fair.",
        perspective: "Quality analyst",
        bias: "conservative",
      },
      synthesizer: {
        id: "synthesizer",
        name: "Creative Synthesizer",
        goal: "Weave validated ideas into a cohesive draft",
        instructions:
          "Take the validated fragments and craft them into a unified, " +
          "polished piece. Maintain the best qualities of each source.",
        perspective: "Editor and craftsperson",
        bias: "balanced",
      },
      orchestrator: {
        id: "orchestrator",
        name: "Quality Orchestrator",
        goal: "Ensure final output meets quality standards",
        instructions:
          "Evaluate the synthesized draft against requirements. " +
          "If quality is insufficient, identify specific deficiencies " +
          "and request a rerun with correction guidance.",
        perspective: "Executive editor",
        bias: "conservative",
      },
    })
    .goals(
      "Produce creative content that is original, coherent, and impactful",
      [
        "Explore multiple creative directions",
        "Filter for quality and coherence",
        "Synthesize into a unified draft",
        "Iterate until quality threshold is met",
      ],
      [
        "Originality of ideas",
        "Logical coherence",
        "Audience engagement",
        "Alignment with prompt constraints",
      ]
    )
    .build();
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: Pipeline Agent Factory
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create the strategy agents for each pipeline layer.
 *
 * KEY CONCEPT: StrategyAgent is LAYER-BLIND. The same agent class works in
 * any layer — behavior is determined entirely by the injected PromptStrategy
 * and OutputParserStrategy. This eliminates all layer-specific conditionals.
 */
function createPipelineAgents(task: ReturnType<typeof buildCreativeTask>) {
  const model = "gpt-4o-mini"; // Cost-effective for demos; use gpt-4o for production

  // ─── LAYER 1: Divergent Agents (run in parallel) ───
  // Each gets a different role to ensure diverse explorations
  const divergentAgents = [
    new OpenAIStrategyAgent({
      name: "Explorer-A",
      model,
      maxTokens: 800,
      role: task.roles.explorer_a,
      task,
      promptStrategy: new DivergentPromptStrategy(),
      outputParserStrategy: new DivergentOutputParser(),
    }),
    new OpenAIStrategyAgent({
      name: "Explorer-B",
      model,
      maxTokens: 800,
      role: task.roles.explorer_b,
      task,
      promptStrategy: new DivergentPromptStrategy(),
      outputParserStrategy: new DivergentOutputParser(),
    }),
    new OpenAIStrategyAgent({
      name: "Explorer-C",
      model,
      maxTokens: 800,
      role: task.roles.explorer_c,
      task,
      promptStrategy: new DivergentPromptStrategy(),
      outputParserStrategy: new DivergentOutputParser(),
    }),
  ];

  // ─── LAYER 2: Inquisitor (uses Structured Outputs for deterministic JSON) ───
  const inquisitorAgent = new OpenAIStrategyAgent({
    name: "Inquisitor",
    model,
    maxTokens: 1200,
    role: task.roles.critic,
    task,
    promptStrategy: new InquisitorPromptStrategy(),
    outputParserStrategy: new InquisitorOutputParser(),
    structuredOutputSchema: INQUISITOR_SCHEMA, // Enables OpenAI json_schema mode
  });

  // ─── LAYER 3: Synthesizer (free-text output) ───
  const synthesizerAgent = new OpenAIStrategyAgent({
    name: "Synthesizer",
    model,
    maxTokens: 1500,
    role: task.roles.synthesizer,
    task,
    promptStrategy: new SynthesizerPromptStrategy(),
    outputParserStrategy: new SynthesizerOutputParser(),
  });

  // ─── LAYER 4: Orchestrator (Structured Outputs for deliver/rerun decision) ───
  const orchestratorAgent = new OpenAIStrategyAgent({
    name: "Orchestrator",
    model,
    maxTokens: 600,
    role: task.roles.orchestrator,
    task,
    promptStrategy: new OrchestratorPromptStrategy(),
    outputParserStrategy: new OrchestratorOutputParser(),
    structuredOutputSchema: ORCHESTRATOR_SCHEMA, // Ensures deterministic JSON verdict
  });

  return { divergentAgents, inquisitorAgent, synthesizerAgent, orchestratorAgent };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: Run the Pipeline
// ═══════════════════════════════════════════════════════════════════════════════

async function runPipelineDemo() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║         POLARIS CREATIVA — Pipeline Mode Demo               ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log();

  // ─── Build task and agents ───
  const task = buildCreativeTask();
  const agents = createPipelineAgents(task);

  console.log("📋 Task:", task.name);
  console.log("🤖 Divergent agents:", agents.divergentAgents.length);
  console.log("🔍 Inquisitor: Structured Output (json_schema)");
  console.log("🧵 Synthesizer: Free-text drafting");
  console.log("⚖️  Orchestrator: Structured Output (deliver/rerun)");
  console.log();

  // ─── Decay configuration ───
  // Controls the iterative quality loop
  const decayConfig: DecayConfig = {
    maxIterations: 3, // At most 3 passes through the pipeline
    baseTemperature: 0.8, // Starting temperature for Layer 1
    temperatureIncrement: 0.1, // Increase creativity each iteration
    temperatureCeiling: 1.2, // Never exceed this temperature
    promptMutationFactor: 0.3, // How aggressively correction prompts diverge
    tokenBudget: 15000, // Hard cost ceiling
    agentTimeoutMs: 60000, // 60s timeout per divergent agent
    minSurvivingAgents: 1, // At least 1 agent must succeed per iteration
  };

  console.log("⚙️  Decay Configuration:");
  console.log(`   Max iterations: ${decayConfig.maxIterations}`);
  console.log(`   Base temperature: ${decayConfig.baseTemperature}`);
  console.log(`   Temperature increment: +${decayConfig.temperatureIncrement} per iteration`);
  console.log(`   Temperature ceiling: ${decayConfig.temperatureCeiling}`);
  console.log(`   Token budget: ${decayConfig.tokenBudget.toLocaleString()} tokens`);
  console.log(`   Agent timeout: ${decayConfig.agentTimeoutMs / 1000}s per agent`);
  console.log();

  // ─── Pipeline configuration ───
  const pipelineConfig: LayerPipelineConfig = {
    task,
    divergentAgents: agents.divergentAgents,
    inquisitorAgent: agents.inquisitorAgent,
    synthesizerAgent: agents.synthesizerAgent,
    orchestratorAgent: agents.orchestratorAgent,
    decayConfig,
  };

  // ─── Engine configuration ───
  const engineConfig: PolarisEngineConfig = {
    task,
    agents: agents.divergentAgents, // Flat-mode agents (unused in pipeline mode)
    mode: "pipeline",
    pipelineConfig,
  };

  const engine = new PolarisEngine(engineConfig);

  // ─── Creative prompt ───
  const state = new CreativeState(
    "Write a compelling opening paragraph for a science fiction story " +
      "set in a world where memories can be traded as currency.",
    [
      "Must evoke strong emotion in the first sentence",
      "Should hint at the story's central conflict",
      "Under 200 words",
    ]
  );

  console.log("─".repeat(62));
  console.log("📝 PROMPT:", state.prompt);
  console.log("📌 Constraints:", state.constraints.join(" | "));
  console.log("─".repeat(62));
  console.log();
  console.log("🚀 Starting pipeline execution...");
  console.log();

  const startTime = performance.now();

  try {
    // Run the pipeline
    const result = await engine.inference({ state, actions: [new NoAction()] });

    const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);

    console.log("─".repeat(62));
    console.log("✅ PIPELINE COMPLETE");
    console.log("─".repeat(62));
    console.log();

    // The pipeline result is a typed field on EngineOutput
    const pr = result.pipelineResult;

    if (pr) {
      console.log("📊 Pipeline Metrics:");
      console.log(`   Total iterations: ${pr.totalIterations}`);
      console.log(`   Forced delivery: ${pr.forcedDelivery ? `Yes (${pr.forcedDeliveryReason})` : "No"}`);
      console.log(`   Last verdict: ${pr.lastVerdict.decision} (error delta: ${pr.lastVerdict.errorDelta.toFixed(2)})`);
      console.log(`   Total tokens: ${pr.totalTokensConsumed.toLocaleString()}`);
      console.log(`   Total time: ${elapsed}s`);
      console.log();

      // Show per-iteration breakdown
      console.log("📈 Iteration Breakdown:");
      for (const iter of pr.iterationBreakdowns) {
        console.log(`   Iteration ${iter.iteration + 1}:`);
        console.log(`     Divergent: ${iter.divergentTimeMs.toFixed(0)}ms | Inquisitor: ${iter.inquisitorTimeMs.toFixed(0)}ms`);
        console.log(`     Synthesizer: ${iter.synthesizerTimeMs.toFixed(0)}ms | Orchestrator: ${iter.orchestratorTimeMs.toFixed(0)}ms`);
        console.log(`     Verdict: ${iter.verdict.decision} | Agents survived: ${iter.agentsSurvived}/${agents.divergentAgents.length}`);
        if (iter.verdict.deficiencies && iter.verdict.deficiencies.length > 0) {
          console.log(`     Deficiencies: ${iter.verdict.deficiencies.join("; ")}`);
        }
        console.log();
      }

      // Show final output
      console.log("═".repeat(62));
      console.log("📖 FINAL OUTPUT:");
      console.log("═".repeat(62));
      console.log();
      console.log(pr.finalOutput);
      console.log();
      console.log("═".repeat(62));
    } else {
      // Fallback: show flat-mode results
      console.log("Agent outputs:", result.agentOutputs.length);
      for (const output of result.agentOutputs) {
        const ev = output.evaluation;
        console.log(`\n[${output.agentId}] Score: ${ev.score}, Confidence: ${ev.confidence}`);
        console.log(ev.reasoning?.substring(0, 200));
      }
    }
  } catch (error: any) {
    console.error("❌ Pipeline failed:", error.message);
    if (error.code) console.error("   Code:", error.code);
    if (error.context) console.error("   Context:", JSON.stringify(error.context, null, 2));
  }

  // Cleanup
  await engine.cleanup();
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: Flat Mode Comparison Demo
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compare flat mode (single-pass parallel) vs pipeline mode for the same prompt.
 * This illustrates when each mode is appropriate:
 *
 * - FLAT MODE: Quick evaluation, multiple perspectives, no iteration needed.
 *   Good for: scoring, classification, simple analysis.
 *
 * - PIPELINE MODE: Iterative refinement, quality loop, creative generation.
 *   Good for: writing, design, complex synthesis tasks.
 */
async function flatModeDemo() {
  console.log();
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║              FLAT MODE — Parallel Multi-Agent               ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log();

  const task = TaskBuilder.create("quick-analysis", "Quick Creative Analysis")
    .description("Get multiple perspectives on a creative prompt in a single pass")
    .commonDomain("GENERAL")
    .commonRoles(["ANALYST", "RISKY", "CONSERVATIVE"])
    .goals("Provide diverse perspectives on the creative direction")
    .build();

  // Create flat-mode agents (these build their own prompts from role + task)
  const agents = [
    openAiAgent({
      role: task.roles.ANALYST,
      task,
      model: "gpt-4o-mini",
      temperature: 0.7,
    }),
    openAiAgent({
      role: task.roles.RISKY,
      task,
      model: "gpt-4o-mini",
      temperature: 0.9,
    }),
    openAiAgent({
      role: task.roles.CONSERVATIVE,
      task,
      model: "gpt-4o-mini",
      temperature: 0.3,
    }),
  ];

  const engine = new PolarisEngine({
    task,
    agents,
    mode: "flat", // Single-pass parallel evaluation
  });

  const state = new CreativeState(
    "A science fiction story where memories are currency",
    ["Must be emotionally resonant", "Under 200 words"]
  );

  console.log("📝 Same prompt, flat mode — 3 agents evaluate in parallel");
  console.log();

  try {
    const result = await engine.inference({ state, actions: [new NoAction()] });

    console.log(`✅ Got ${result.agentOutputs.length} independent evaluations in ${result.engineStatistics.totalInferenceTime.toFixed(0)}ms`);
    console.log();

    for (const output of result.agentOutputs) {
      const { score, confidence, reasoning } = output.evaluation;
      console.log(`─── ${output.agentId} ───`);
      console.log(`Score: ${score.toFixed(2)} | Confidence: ${confidence.toFixed(2)}`);
      console.log(`Reasoning: ${reasoning?.substring(0, 150) ?? "N/A"}...`);
      console.log();
    }
  } catch (error: any) {
    console.error("❌ Flat mode failed:", error.message);
  }

  await engine.cleanup();
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: Main Entry Point
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log();
  console.log("This demo shows both execution modes of POLARIS:");
  console.log("  1. Pipeline (Polaris Creativa) — iterative 4-layer creative pipeline");
  console.log("  2. Flat — single-pass parallel multi-agent evaluation");
  console.log();

  // Check for API key
  if (!process.env.OPENAI_API_KEY) {
    console.error("⚠️  OPENAI_API_KEY not set. Copy .env.example to .env and add your key.");
    console.error("   The pipeline demo requires OpenAI for Structured Outputs.");
    process.exit(1);
  }

  await runPipelineDemo();
  await flatModeDemo();

  console.log();
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║                    Demo Complete                             ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
