/**
 * Prompt strategy for Layer 2: The Inquisitor.
 * Receives raw divergent explorations and filters them for logical coherence.
 * Produces validated fragments with coherence scores.
 */

import { PromptStrategy, PromptContext } from "./prompt-strategy";
import { DivergentPayload } from "../types/layer";

export class InquisitorPromptStrategy implements PromptStrategy {
  buildSystemPrompt(_context: PromptContext): string {
    return (
      `You are a rigorous logical filter. Your SOLE function is quality control.\n\n` +
      `RULES:\n` +
      `- You will receive raw explorations from multiple creative agents.\n` +
      `- For EACH exploration, extract the logically coherent fragments.\n` +
      `- Discard any fragment that contains logical fallacies, unsupported claims, or internal contradictions.\n` +
      `- Accept fragments that are logically sound, well-reasoned, and relevant to the task goal.\n` +
      `- Assign each accepted fragment a coherence score (0.0 to 1.0).\n` +
      `- Provide a brief justification for each accepted fragment explaining why it passed your filter.\n` +
      `- You add NO new ideas. You only filter and validate.\n` +
      `- Be strict but fair: do not reject merely unconventional ideas if they are logically sound.\n\n` +
      `RESPOND IN THIS EXACT JSON FORMAT:\n` +
      `{\n` +
      `  "validatedFragments": [\n` +
      `    {\n` +
      `      "content": "<the validated text>",\n` +
      `      "sourceAgentId": "<agent ID that produced it>",\n` +
      `      "justification": "<why this passed the filter>",\n` +
      `      "coherenceScore": <0.0 to 1.0>\n` +
      `    }\n` +
      `  ],\n` +
      `  "rejectedCount": <number>,\n` +
      `  "totalEvaluated": <number>\n` +
      `}\n\n` +
      `Respond with valid JSON ONLY. No commentary outside the JSON object.`
    );
  }

  buildUserPrompt(context: PromptContext): string {
    const payload = context.incomingMessage?.payload as DivergentPayload | undefined;

    if (!payload || payload.explorations.length === 0) {
      return (
        `TASK GOAL: ${context.task.goals.primary}\n\n` +
        `[WARNING: No explorations received from divergent agents.\n` +
        `Return an empty validatedFragments array.]`
      );
    }

    const explorationsBlock = payload.explorations
      .map(
        (e, i) =>
          `--- EXPLORATION ${i + 1} (Agent: ${e.agentId}, Perspective: ${e.heuristicLabel}) ---\n` +
          `${e.rawContent}`
      )
      .join("\n\n");

    return (
      `TASK GOAL: ${context.task.goals.primary}\n` +
      (context.task.goals.secondary
        ? `SECONDARY GOALS: ${context.task.goals.secondary.join("; ")}\n`
        : "") +
      `DOMAIN: ${context.task.domain.name} — ${context.task.domain.description}\n\n` +
      `RAW EXPLORATIONS TO FILTER:\n\n` +
      `${explorationsBlock}\n\n` +
      `Extract logically coherent fragments from the explorations above.\n` +
      `Assign coherence scores and provide justifications.\n` +
      `Respond with valid JSON only.`
    );
  }

  getTemperature(_context: PromptContext): number {
    return 0.2;
  }

  getMaxTokens(_context: PromptContext): number {
    return 2500;
  }
}
