/**
 * Prompt strategy for Layer 1: Divergent Generators.
 * Produces raw creative explorations from diverse perspectives.
 * Receives reinjection context from the Orchestrator on subsequent iterations.
 */

import { PromptStrategy, PromptContext } from "./prompt-strategy";
import { OrchestratorPayload } from "../types/layer";

export class DivergentPromptStrategy implements PromptStrategy {
  buildSystemPrompt(_context: PromptContext): string {
    return (
      `You are a creative divergent thinker. Your SOLE function is exploration.\n\n` +
      `RULES:\n` +
      `- Generate a raw, unfiltered exploration of the problem space from your assigned perspective.\n` +
      `- Be bold, speculative, and thorough. Cover angles others might miss.\n` +
      `- Do NOT self-censor or pre-filter your ideas. A downstream quality system will handle that.\n` +
      `- Do NOT structure your output as a formal report. Write freely and expansively.\n` +
      `- Focus on depth over breadth: explore fewer ideas more thoroughly rather than listing many surface-level points.\n` +
      `- If you receive correction feedback from a previous iteration, prioritize addressing the identified gaps.\n\n` +
      `OUTPUT FORMAT:\n` +
      `Return your exploration as free-form text. No JSON. No markdown headers required.\n` +
      `Write naturally and thoroughly.`
    );
  }

  buildUserPrompt(context: PromptContext): string {
    const roleBlock =
      `YOUR PERSPECTIVE: ${context.role.name}\n` +
      `GOAL: ${context.role.goal}\n` +
      `INSTRUCTIONS: ${context.role.instructions}\n` +
      (context.role.perspective ? `PERSPECTIVE: ${context.role.perspective}\n` : "");

    const taskBlock =
      `\nTASK: ${context.task.goals.primary}\n` +
      (context.task.goals.secondary
        ? `SECONDARY GOALS: ${context.task.goals.secondary.join("; ")}\n`
        : "") +
      `DOMAIN: ${context.task.domain.name} — ${context.task.domain.description}\n`;

    // State context (if available)
    let stateBlock = "";
    if (context.state) {
      const stateData = context.state.serialize();
      stateBlock =
        `\nCURRENT STATE:\n` +
        `${JSON.stringify(stateData, null, 2)}\n`;
    }

    // Reinjection context from previous iteration
    let correctionBlock = "";
    if (context.incomingMessage) {
      const payload = context.incomingMessage.payload as OrchestratorPayload | undefined;
      if (payload?.decayState?.correctionPrompt) {
        correctionBlock =
          `\n⚠ CORRECTION FROM PREVIOUS ITERATION:\n` +
          `${payload.decayState.correctionPrompt}\n` +
          `\nAddress the above feedback. Explore different angles than your previous attempt.\n`;
      }
    }

    // Iteration info
    const iterationBlock =
      context.pipelineIteration !== undefined && context.pipelineIteration > 0
        ? `\nIteration ${context.pipelineIteration}: You MUST produce substantially different output from previous iterations.\n`
        : "";

    return (
      roleBlock +
      taskBlock +
      stateBlock +
      correctionBlock +
      iterationBlock +
      `\nExplore this problem thoroughly from your assigned perspective. Write freely.`
    );
  }

  getTemperature(context: PromptContext): number {
    // Base temperature + decay delta for increased exploration on reruns
    const base = 0.9;
    const delta = context.effectiveTemperature ?? 0;
    return Math.min(base + delta, 1.5);
  }

  getMaxTokens(_context: PromptContext): number {
    return 2000;
  }
}
