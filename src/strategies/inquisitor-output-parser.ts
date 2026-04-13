/**
 * Output parser for Layer 2: The Inquisitor.
 * Extracts validated fragments from the Inquisitor's JSON output.
 */

import {
  OutputParserStrategy,
  RawLLMResponse,
  ParsedOutput,
} from "./output-parser-strategy";
import { ValidatedFragment } from "../types/layer";
import { EvaluationResult } from "../types/evaluation";

export class InquisitorOutputParser implements OutputParserStrategy {
  parse(response: RawLLMResponse): ParsedOutput {
    let fragments: ValidatedFragment[] = [];
    let totalEvaluated = 0;
    let rejectedCount = 0;

    try {
      let content = response.content;

      // Strip markdown code blocks if present
      const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
      const match = content.match(jsonRegex);
      if (match?.[1]) {
        content = match[1];
      } else {
        const codeBlockRegex = /```\s*([\s\S]*?)\s*```/;
        const codeMatch = content.match(codeBlockRegex);
        if (codeMatch?.[1]) {
          content = codeMatch[1];
        }
      }

      const parsed = JSON.parse(content);

      if (Array.isArray(parsed.validatedFragments)) {
        fragments = parsed.validatedFragments.map((f: any) => ({
          content: String(f.content ?? ""),
          sourceAgentId: String(f.sourceAgentId ?? "unknown"),
          justification: String(f.justification ?? ""),
          coherenceScore: Math.max(0, Math.min(1, Number(f.coherenceScore ?? 0.5))),
        }));
      }

      totalEvaluated = Number(parsed.totalEvaluated ?? fragments.length);
      rejectedCount = Number(parsed.rejectedCount ?? 0);
    } catch {
      // JSON parse failure — return empty fragments (conservative: nothing passes)
      fragments = [];
    }

    const confidence = fragments.length > 0 ? 0.8 : 0.3;

    const evaluation: EvaluationResult = {
      agentId: response.agentId,
      score: confidence,
      confidence,
      reasoning:
        `Inquisitor accepted ${fragments.length} fragment(s) from ${totalEvaluated} evaluated. ` +
        `Rejected: ${rejectedCount}.`,
      evaluationTime: response.processingTime,
      metadata: {
        model: response.model,
        tokensUsed: response.tokensUsed,
        fragmentCount: fragments.length,
        totalEvaluated,
        rejectedCount,
        isInquisitorOutput: true,
      },
    };

    return {
      evaluation,
      validatedFragments: fragments,
    };
  }
}
