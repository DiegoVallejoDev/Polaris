/**
 * Output parser strategy for Layer 4: The Orchestrator / Router.
 * Enforces strict JSON mapping to OrchestratorVerdict.
 */

import {
  OutputParserStrategy,
  RawLLMResponse,
  ParsedOutput,
} from "./output-parser-strategy";
import { OrchestratorVerdict } from "../types/layer";
import { EvaluationResult } from "../types/evaluation";

export class OrchestratorOutputParser implements OutputParserStrategy {
  parse(response: RawLLMResponse): ParsedOutput {
    let verdict: OrchestratorVerdict;

    try {
      let content = response.content;

      // Strip markdown code blocks
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

      const rawDecision = String(parsed.decision ?? "rerun").toLowerCase();
      const decision: "deliver" | "rerun" =
        rawDecision === "deliver" ? "deliver" : "rerun";

      const errorDelta = Math.max(0, Math.min(1, Number(parsed.errorDelta ?? 0.5)));

      const deficiencies: string[] = Array.isArray(parsed.deficiencies)
        ? parsed.deficiencies.map(String)
        : [];

      const correctionPrompt =
        typeof parsed.correctionPrompt === "string"
          ? parsed.correctionPrompt
          : undefined;

      verdict = {
        decision,
        errorDelta,
        deficiencies,
        correctionPrompt,
      };
    } catch {
      // JSON parse failure → conservative: force rerun
      verdict = {
        decision: "rerun",
        errorDelta: 0.8,
        deficiencies: ["Orchestrator failed to produce valid JSON evaluation"],
        correctionPrompt:
          "Previous evaluation cycle failed. Re-examine the problem from first principles.",
      };
    }

    const evaluation: EvaluationResult = {
      agentId: response.agentId,
      score: 1.0 - verdict.errorDelta,
      confidence: verdict.decision === "deliver" ? 0.9 : 0.5,
      reasoning:
        `Orchestrator verdict: ${verdict.decision}. ` +
        `Error delta: ${verdict.errorDelta.toFixed(3)}. ` +
        `Deficiencies: ${verdict.deficiencies?.length ?? 0}.`,
      evaluationTime: response.processingTime,
      metadata: {
        model: response.model,
        tokensUsed: response.tokensUsed,
        isOrchestratorOutput: true,
        verdict,
      },
    };

    return {
      evaluation,
      orchestratorVerdict: verdict,
    };
  }
}
