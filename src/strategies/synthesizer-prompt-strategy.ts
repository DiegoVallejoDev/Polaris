/**
 * Prompt strategy for Layer 3: The Synthesizer Architect.
 * Receives validated fragments from the Inquisitor (Layer 2).
 * Produces a unified, structured draft.
 */

import { PromptStrategy, PromptContext } from "./prompt-strategy";
import { InquisitorPayload } from "../types/layer";

export class SynthesizerPromptStrategy implements PromptStrategy {
  buildSystemPrompt(_context: PromptContext): string {
    return (
      `You are a master synthesizer and technical writer. Your SOLE function is assembly.\n\n` +
      `RULES:\n` +
      `- You will receive a set of pre-validated logical fragments from a quality-control system.\n` +
      `- Every fragment you receive has ALREADY been verified for logical coherence. Do NOT re-evaluate or discard them.\n` +
      `- Your job is to weave ALL fragments into a single, unified, fluent draft.\n` +
      `- Resolve transitions between ideas that originated from different analytical perspectives.\n` +
      `- Impose a clear structure: use numbered sections with descriptive headers.\n` +
      `- Eliminate redundancy: if two fragments express the same idea, merge them into the strongest formulation.\n` +
      `- Preserve the intellectual diversity of the source fragments — do not flatten nuance.\n` +
      `- You add NO new ideas. You are an assembler, not a creator.\n` +
      `- Write in clear, professional prose. No bullet-point dumps unless structurally necessary.\n\n` +
      `OUTPUT FORMAT:\n` +
      `Return ONLY the synthesized draft as plain text with markdown section headers (## Section Name).\n` +
      `Do NOT wrap in JSON. Do NOT add meta-commentary about your process.`
    );
  }

  buildUserPrompt(context: PromptContext): string {
    const payload = context.incomingMessage?.payload as InquisitorPayload | undefined;

    if (!payload || payload.validatedFragments.length === 0) {
      return (
        `TASK GOAL: ${context.task.goals.primary}\n\n` +
        `[WARNING: No validated fragments received from the Inquisitor layer.\n` +
        `Generate a minimal draft acknowledging insufficient input data.]`
      );
    }

    const fragmentsBlock = payload.validatedFragments
      .map(
        (f, i) =>
          `--- FRAGMENT ${i + 1} (Source: ${f.sourceAgentId}, Coherence: ${f.coherenceScore.toFixed(2)}) ---\n` +
          `${f.content}\n` +
          `Justification for inclusion: ${f.justification}`
      )
      .join("\n\n");

    const metricsLine =
      `Filter metrics: ${payload.filterMetrics.accepted} accepted / ` +
      `${payload.filterMetrics.totalEvaluated} evaluated / ` +
      `${payload.filterMetrics.rejected} rejected.`;

    return (
      `TASK GOAL: ${context.task.goals.primary}\n` +
      (context.task.goals.secondary
        ? `SECONDARY GOALS: ${context.task.goals.secondary.join("; ")}\n`
        : "") +
      `DOMAIN: ${context.task.domain.name} — ${context.task.domain.description}\n\n` +
      `${metricsLine}\n\n` +
      `VALIDATED FRAGMENTS TO SYNTHESIZE:\n\n` +
      `${fragmentsBlock}\n\n` +
      `Weave ALL fragments above into a single cohesive draft.\n` +
      `Use numbered sections (## 1. Title, ## 2. Title, etc.) to impose structure.\n` +
      `Resolve transitions between ideas from different source agents.\n` +
      `Return ONLY the draft text.`
    );
  }

  getTemperature(_context: PromptContext): number {
    return 0.4;
  }

  getMaxTokens(_context: PromptContext): number {
    return 3000;
  }
}
