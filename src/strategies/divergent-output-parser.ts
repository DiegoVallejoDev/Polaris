/**
 * Output parser for Layer 1: Divergent Generators.
 * Extracts raw exploration text — minimal parsing since divergent output is free-form.
 */

import {
  OutputParserStrategy,
  RawLLMResponse,
  ParsedOutput,
} from "./output-parser-strategy";
import { EvaluationResult } from "../types/evaluation";

export class DivergentOutputParser implements OutputParserStrategy {
  parse(response: RawLLMResponse): ParsedOutput {
    const content = response.content.trim();

    // Divergent output is free-form text — confidence derived from substance
    const hasSubstance = content.length > 100;
    const confidence = hasSubstance ? 0.7 : content.length > 0 ? 0.4 : 0.1;

    const evaluation: EvaluationResult = {
      agentId: response.agentId,
      score: confidence,
      confidence,
      reasoning: content.length > 200 ? content.slice(0, 200) + "..." : content,
      evaluationTime: response.processingTime,
      metadata: {
        model: response.model,
        tokensUsed: response.tokensUsed,
        contentLength: content.length,
        isDivergentOutput: true,
      },
    };

    return {
      evaluation,
      rawContent: content,
    };
  }
}
