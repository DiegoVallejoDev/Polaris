/**
 * Prompt strategy for Layer 4: The Orchestrator / Router.
 * Compares the synthesized draft against the original requirement.
 * Produces a binary decision: deliver or rerun.
 *
 * Cost-aware: incorporates cumulative token usage into the routing
 * decision. A rerun is only justified if the projected quality improvement
 * outweighs the projected token expenditure.
 */

import { PromptStrategy, PromptContext } from "./prompt-strategy";
import { SynthesizerPayload } from "../types/layer";

export class OrchestratorPromptStrategy implements PromptStrategy {
  buildSystemPrompt(_context: PromptContext): string {
    return (
      `You are a ruthless quality gate with cost awareness. You have TWO jobs:\n` +
      `1. Compare a draft against an original requirement and judge quality.\n` +
      `2. Decide if the quality gap justifies the cost of rerunning the pipeline.\n\n` +
      `RULES:\n` +
      `- Compute an ERROR DELTA (0.0 to 1.0):\n` +
      `  - 0.0 = draft perfectly fulfills the requirement.\n` +
      `  - 1.0 = draft is completely irrelevant.\n` +
      `- You will receive TOKEN BUDGET information. Use it.\n` +
      `- ROI CALCULATION:\n` +
      `  - If errorDelta <= 0.3 → decision is "deliver" (quality is acceptable).\n` +
      `  - If errorDelta > 0.3 AND remainingBudget > averageTokensPerIteration → decision is "rerun".\n` +
      `  - If errorDelta > 0.3 BUT remainingBudget <= averageTokensPerIteration → decision is "deliver" (budget exhausted, deliver best available).\n` +
      `- When deciding "rerun", provide:\n` +
      `  - A list of specific deficiencies.\n` +
      `  - A correctionPrompt for the creative agents.\n` +
      `- Be mathematical, not emotional.\n\n` +
      `RESPOND IN THIS EXACT JSON FORMAT:\n` +
      `{\n` +
      `  "decision": "deliver" | "rerun",\n` +
      `  "errorDelta": <0.0 to 1.0>,\n` +
      `  "deficiencies": ["<deficiency_1>", ...],\n` +
      `  "correctionPrompt": "<instruction for creative agents>"\n` +
      `}\n\n` +
      `Respond with valid JSON ONLY.`
    );
  }

  buildUserPrompt(context: PromptContext): string {
    const payload = context.incomingMessage?.payload as
      | SynthesizerPayload
      | undefined;

    const draft =
      payload?.draft ?? "[ERROR: No draft received from Synthesizer layer]";
    const structureInfo = payload?.structure
      ? `Draft structure: ${payload.structure.sectionCount} sections, ~${payload.structure.estimatedTokens} tokens.`
      : "";

    const iterationInfo =
      context.pipelineIteration !== undefined && context.pipelineIteration > 0
        ? `\nNOTE: This is pipeline iteration ${context.pipelineIteration}. Previous iterations failed quality checks.`
        : "";

    const secondaryGoals = context.task.goals.secondary
      ? `\nSECONDARY GOALS:\n${context.task.goals.secondary.map((g: string, i: number) => `  ${i + 1}. ${g}`).join("\n")}`
      : "";

    const successCriteria = context.task.goals.successCriteria
      ? `\nSUCCESS CRITERIA:\n${context.task.goals.successCriteria.map((c: string, i: number) => `  ${i + 1}. ${c}`).join("\n")}`
      : "";

    // Cost-awareness block
    const tokenUsage = context.cumulativeTokenUsage;
    const costBlock = tokenUsage
      ? `\nTOKEN BUDGET STATUS:\n` +
        `  Total tokens consumed: ${tokenUsage.totalTokens}\n` +
        `  This iteration: ${tokenUsage.currentIterationTokens}\n` +
        `  Budget ceiling: ${tokenUsage.tokenBudget}\n` +
        `  Remaining budget: ${tokenUsage.remainingBudget}\n` +
        `  Avg tokens/iteration: ${tokenUsage.averageTokensPerIteration}\n` +
        `  Projected reruns possible: ${Math.floor(tokenUsage.remainingBudget / Math.max(tokenUsage.averageTokensPerIteration, 1))}\n`
      : "";

    return (
      `ORIGINAL REQUIREMENT:\n` +
      `Primary Goal: ${context.task.goals.primary}` +
      `${secondaryGoals}` +
      `${successCriteria}\n\n` +
      `Domain: ${context.task.domain.name} — ${context.task.domain.description}\n` +
      `${structureInfo}` +
      `${iterationInfo}` +
      `${costBlock}\n\n` +
      `DRAFT TO EVALUATE:\n` +
      `---BEGIN DRAFT---\n` +
      `${draft}\n` +
      `---END DRAFT---\n\n` +
      `Evaluate this draft against the original requirement.\n` +
      `Factor token budget into your rerun/deliver decision.\n` +
      `Respond with valid JSON only.`
    );
  }

  getTemperature(_context: PromptContext): number {
    return 0.1;
  }

  getMaxTokens(_context: PromptContext): number {
    return 1500;
  }
}
