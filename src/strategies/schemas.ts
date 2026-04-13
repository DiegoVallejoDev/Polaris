/**
 * JSON Schema definitions for OpenAI Structured Outputs.
 * Used by Layers 2 (Inquisitor) and 4 (Orchestrator) to guarantee
 * schema compliance at the provider level, eliminating regex fallbacks.
 */

import { StructuredOutputSchema } from "../agents/web/openai-strategy-agent";

/**
 * Schema for Layer 2 (Inquisitor) output.
 * Guarantees the LLM returns validatedFragments in the exact structure
 * expected by InquisitorOutputParser.
 */
export const INQUISITOR_SCHEMA: StructuredOutputSchema = {
  name: "inquisitor_evaluation",
  strict: true,
  schema: {
    type: "object",
    properties: {
      validatedFragments: {
        type: "array",
        items: {
          type: "object",
          properties: {
            content: { type: "string" },
            sourceAgentId: { type: "string" },
            justification: { type: "string" },
            coherenceScore: { type: "number" },
          },
          required: ["content", "sourceAgentId", "justification", "coherenceScore"],
          additionalProperties: false,
        },
      },
      rejectedCount: { type: "number" },
      totalEvaluated: { type: "number" },
    },
    required: ["validatedFragments", "rejectedCount", "totalEvaluated"],
    additionalProperties: false,
  },
};

/**
 * Schema for Layer 4 (Orchestrator) output.
 * Guarantees the LLM returns a verdict in the exact structure
 * expected by OrchestratorOutputParser.
 */
export const ORCHESTRATOR_SCHEMA: StructuredOutputSchema = {
  name: "orchestrator_verdict",
  strict: true,
  schema: {
    type: "object",
    properties: {
      decision: { type: "string", enum: ["deliver", "rerun"] },
      errorDelta: { type: "number" },
      deficiencies: {
        type: "array",
        items: { type: "string" },
      },
      correctionPrompt: { type: "string" },
    },
    required: ["decision", "errorDelta", "deficiencies", "correctionPrompt"],
    additionalProperties: false,
  },
};
