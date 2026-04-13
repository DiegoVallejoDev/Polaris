/**
 * Output parser strategy for Layer 3: The Synthesizer Architect.
 * Extracts the draft and computes structural metadata.
 */

import {
  OutputParserStrategy,
  RawLLMResponse,
  ParsedOutput,
} from "./output-parser-strategy";
import { EvaluationResult } from "../types/evaluation";

export class SynthesizerOutputParser implements OutputParserStrategy {
  parse(response: RawLLMResponse): ParsedOutput {
    const draft = response.content.trim();

    // Count markdown sections (## headers)
    const sectionMatches = draft.match(/^#{1,3}\s+.+$/gm);
    const sectionCount = sectionMatches ? sectionMatches.length : 1;

    // Estimate token count (~4 chars per token for English text)
    const estimatedTokens = Math.ceil(draft.length / 4);

    // Confidence derived from draft substance
    const hasSections = sectionCount >= 2;
    const hasSubstance = draft.length > 200;
    const confidence = hasSections && hasSubstance ? 0.8 : hasSubstance ? 0.6 : 0.3;

    const evaluation: EvaluationResult = {
      agentId: response.agentId,
      score: confidence,
      confidence,
      reasoning:
        `Synthesized draft with ${sectionCount} section(s), ` +
        `~${estimatedTokens} estimated tokens.`,
      evaluationTime: response.processingTime,
      metadata: {
        model: response.model,
        tokensUsed: response.tokensUsed,
        sectionCount,
        estimatedDraftTokens: estimatedTokens,
        draftLength: draft.length,
        isSynthesizerOutput: true,
      },
    };

    return {
      evaluation,
      synthesizedDraft: draft,
    };
  }
}
