/**
 * Strategy system exports for Polaris Creativa pipeline.
 */

// ─── Interfaces ───
export type {
  PromptStrategy,
  PromptContext,
  CumulativeTokenUsage,
} from "./prompt-strategy";
export type {
  OutputParserStrategy,
  RawLLMResponse,
  ParsedOutput,
  ValidatedFragment,
  OrchestratorVerdict,
} from "./output-parser-strategy";

// ─── Layer 1: Divergent ───
export { DivergentPromptStrategy } from "./divergent-prompt-strategy";
export { DivergentOutputParser } from "./divergent-output-parser";

// ─── Layer 2: Inquisitor ───
export { InquisitorPromptStrategy } from "./inquisitor-prompt-strategy";
export { InquisitorOutputParser } from "./inquisitor-output-parser";

// ─── Layer 3: Synthesizer ───
export { SynthesizerPromptStrategy } from "./synthesizer-prompt-strategy";
export { SynthesizerOutputParser } from "./synthesizer-output-parser";

// ─── Layer 4: Orchestrator ───
export { OrchestratorPromptStrategy } from "./orchestrator-prompt-strategy";
export { OrchestratorOutputParser } from "./orchestrator-output-parser";

// ─── Structured Output Schemas ───
export { INQUISITOR_SCHEMA, ORCHESTRATOR_SCHEMA } from "./schemas";
