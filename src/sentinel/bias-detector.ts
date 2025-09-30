/**
 * Bias detection algorithms for the Sentinel Agent system
 */

import { EvaluationResult, EvaluationContext } from "../types/evaluation";
import { MathUtils } from "../utils/math";
// import { Logger } from '../utils/logger'; // Reserved for future logging

/**
 * Types of bias that can be detected
 */
export enum BiasType {
  SYSTEMATIC = "systematic",
  TEMPORAL = "temporal",
  POSITIONAL = "positional",
  CONFIRMATION = "confirmation",
  ANCHORING = "anchoring",
  GROUPTHINK = "groupthink",
}

/**
 * Configuration for bias detection
 */
export interface BiasDetectionConfig {
  /** Minimum number of evaluations required for bias detection */
  minEvaluations: number;

  /** Threshold for detecting systematic bias (0-1) */
  systematicBiasThreshold: number;

  /** Threshold for detecting temporal bias (0-1) */
  temporalBiasThreshold: number;

  /** Threshold for detecting positional bias (0-1) */
  positionalBiasThreshold: number;

  /** Enable detection of confirmation bias */
  detectConfirmationBias: boolean;

  /** Enable detection of anchoring bias */
  detectAnchoringBias: boolean;

  /** Window size for temporal analysis */
  temporalWindow: number;
}

/**
 * Report of detected bias
 */
export interface BiasReport {
  /** Type of bias detected */
  biasType: BiasType;

  /** Severity score (0-1, higher is more severe) */
  severity: number;

  /** Human-readable description */
  description: string;

  /** IDs of agents affected by this bias */
  affectedAgents: string[];

  /** Recommendations for mitigation */
  recommendations: string[];

  /** Statistical evidence supporting the bias detection */
  evidence: Record<string, number>;

  /** Confidence in the bias detection (0-1) */
  confidence: number;
}

/**
 * Pattern of bias detected in evaluations
 */
export interface BiasPattern {
  pattern: string;
  strength: number;
  frequency: number;
  agents: string[];
}

/**
 * Bias detector implementing various bias detection algorithms
 */
export class BiasDetector {
  private config: BiasDetectionConfig;
  // private logger: Logger; // Reserved for future logging
  private evaluationHistory: EvaluationResult[];

  constructor(config: BiasDetectionConfig) {
    this.config = config;
    // this.logger = new Logger('BiasDetector'); // Reserved for future logging
    this.evaluationHistory = [];
  }

  /**
   * Detect systematic bias in a set of evaluations
   */
  detectSystematicBias(evaluations: EvaluationResult[]): BiasReport | null {
    if (evaluations.length < this.config.minEvaluations) {
      return null;
    }

    // Group evaluations by agent
    const agentEvaluations = this.groupEvaluationsByAgent(evaluations);
    const biasedAgents: string[] = [];
    let maxBiasScore = 0;
    let totalEvidence = 0;

    for (const [agentId, agentEvals] of agentEvaluations) {
      if (agentEvals.length < 3) continue; // Need minimum evaluations per agent

      const scores = agentEvals.map((e) => e.score);
      const biasScore = this.calculateSystematicBiasScore(scores, evaluations);

      if (biasScore > this.config.systematicBiasThreshold) {
        biasedAgents.push(agentId);
        maxBiasScore = Math.max(maxBiasScore, biasScore);
        totalEvidence += biasScore;
      }
    }

    if (biasedAgents.length === 0) {
      return null;
    }

    return {
      biasType: BiasType.SYSTEMATIC,
      severity: maxBiasScore,
      description: `Systematic bias detected in ${biasedAgents.length} agent(s). Agents consistently produce scores that deviate from the group average.`,
      affectedAgents: biasedAgents,
      recommendations: [
        "Consider adjusting agent parameters to reduce systematic deviation",
        "Apply score normalization to affected agents",
        "Increase diversity in agent selection strategies",
      ],
      evidence: {
        maxBiasScore,
        affectedAgentCount: biasedAgents.length,
        totalEvidence,
      },
      confidence: Math.min(maxBiasScore * 1.2, 1.0),
    };
  }

  /**
   * Detect temporal bias (bias that changes over time)
   */
  detectTemporalBias(history: EvaluationResult[]): BiasReport | null {
    if (history.length < this.config.temporalWindow * 2) {
      return null;
    }

    const timeWindows = this.createTimeWindows(
      history,
      this.config.temporalWindow
    );
    if (timeWindows.length < 2) {
      return null;
    }

    // Calculate variance between time windows
    const windowAverages = timeWindows.map((window) => {
      const scores = window.map((e) => e.score);
      return scores.reduce((sum, score) => sum + score, 0) / scores.length;
    });

    const temporalVariance = MathUtils.variance(windowAverages);
    const overallVariance = MathUtils.variance(history.map((e) => e.score));

    // Temporal bias exists if variance between windows is significantly higher than overall variance
    const biasRatio = temporalVariance / (overallVariance + 0.001); // Avoid division by zero

    if (biasRatio < this.config.temporalBiasThreshold) {
      return null;
    }

    // Identify agents contributing to temporal bias
    const affectedAgents = this.identifyTemporallyBiasedAgents(timeWindows);

    return {
      biasType: BiasType.TEMPORAL,
      severity: Math.min(biasRatio / 5, 1.0), // Normalize severity
      description: `Temporal bias detected. Agent evaluations show significant variation over time windows, suggesting inconsistent behavior.`,
      affectedAgents,
      recommendations: [
        "Monitor agent performance stability over time",
        "Consider agent recalibration or parameter adjustment",
        "Implement temporal smoothing in evaluation aggregation",
      ],
      evidence: {
        biasRatio,
        temporalVariance,
        overallVariance,
        windowCount: timeWindows.length,
      },
      confidence: Math.min(biasRatio * 0.8, 1.0),
    };
  }

  /**
   * Detect positional bias (bias based on game state characteristics)
   */
  detectPositionalBias(
    evaluations: EvaluationResult[],
    contexts: EvaluationContext[]
  ): BiasReport | null {
    if (
      evaluations.length !== contexts.length ||
      evaluations.length < this.config.minEvaluations
    ) {
      return null;
    }

    // Group evaluations by depth (as a proxy for position type)
    const depthGroups = new Map<number, EvaluationResult[]>();

    for (let i = 0; i < evaluations.length; i++) {
      const depth = contexts[i].depth;
      if (!depthGroups.has(depth)) {
        depthGroups.set(depth, []);
      }
      depthGroups.get(depth)!.push(evaluations[i]);
    }

    // Calculate variance between depth groups
    const depthAverages: number[] = [];
    const validDepths: number[] = [];

    for (const [depth, evals] of depthGroups) {
      if (evals.length >= 3) {
        // Minimum evaluations per depth
        const avgScore =
          evals.reduce((sum, e) => sum + e.score, 0) / evals.length;
        depthAverages.push(avgScore);
        validDepths.push(depth);
      }
    }

    if (depthAverages.length < 2) {
      return null;
    }

    const positionalVariance = MathUtils.variance(depthAverages);
    const overallVariance = MathUtils.variance(evaluations.map((e) => e.score));
    const biasRatio = positionalVariance / (overallVariance + 0.001);

    if (biasRatio < this.config.positionalBiasThreshold) {
      return null;
    }

    // Identify agents showing positional bias
    const affectedAgents = this.identifyPositionallyBiasedAgents(
      evaluations,
      contexts
    );

    return {
      biasType: BiasType.POSITIONAL,
      severity: Math.min(biasRatio / 3, 1.0),
      description: `Positional bias detected. Agent evaluations vary significantly based on position characteristics (e.g., search depth).`,
      affectedAgents,
      recommendations: [
        "Normalize evaluations based on position characteristics",
        "Train agents on diverse position types",
        "Apply position-aware score adjustments",
      ],
      evidence: {
        biasRatio,
        positionalVariance,
        overallVariance,
        depthGroupCount: validDepths.length,
        minDepth: Math.min(...validDepths),
        maxDepth: Math.max(...validDepths),
      },
      confidence: Math.min(biasRatio * 0.9, 1.0),
    };
  }

  /**
   * Detect confirmation bias (tendency to evaluate in line with initial impressions)
   */
  detectConfirmationBias(evaluations: EvaluationResult[]): BiasReport | null {
    if (
      !this.config.detectConfirmationBias ||
      evaluations.length < this.config.minEvaluations
    ) {
      return null;
    }

    // Group by agent and look for patterns where later evaluations correlate too strongly with earlier ones
    const agentEvaluations = this.groupEvaluationsByAgent(evaluations);
    const biasedAgents: string[] = [];
    let maxCorrelation = 0;

    for (const [agentId, agentEvals] of agentEvaluations) {
      if (agentEvals.length < 5) continue;

      // Sort by timestamp
      const sortedEvals = agentEvals.sort(
        (a, b) => (a.timestamp || 0) - (b.timestamp || 0)
      );
      const correlation = this.calculateAutoCorrelation(
        sortedEvals.map((e) => e.score)
      );

      if (correlation > 0.7) {
        // High correlation suggests confirmation bias
        biasedAgents.push(agentId);
        maxCorrelation = Math.max(maxCorrelation, correlation);
      }
    }

    if (biasedAgents.length === 0) {
      return null;
    }

    return {
      biasType: BiasType.CONFIRMATION,
      severity: maxCorrelation,
      description: `Confirmation bias detected. Some agents show excessive correlation between sequential evaluations.`,
      affectedAgents: biasedAgents,
      recommendations: [
        "Introduce randomization in agent evaluation order",
        "Implement independent evaluation protocols",
        "Reset agent context between evaluations",
      ],
      evidence: {
        maxCorrelation,
        affectedAgentCount: biasedAgents.length,
      },
      confidence: maxCorrelation,
    };
  }

  /**
   * Add evaluation to history for temporal analysis
   */
  addToHistory(evaluation: EvaluationResult): void {
    this.evaluationHistory.push(evaluation);

    // Keep history within reasonable bounds
    const maxHistory = this.config.temporalWindow * 10;
    if (this.evaluationHistory.length > maxHistory) {
      this.evaluationHistory = this.evaluationHistory.slice(-maxHistory);
    }
  }

  /**
   * Get the evaluation history
   */
  getHistory(): EvaluationResult[] {
    return [...this.evaluationHistory];
  }

  /**
   * Clear the evaluation history
   */
  clearHistory(): void {
    this.evaluationHistory = [];
  }

  // Private helper methods

  private groupEvaluationsByAgent(
    evaluations: EvaluationResult[]
  ): Map<string, EvaluationResult[]> {
    const groups = new Map<string, EvaluationResult[]>();

    for (const evaluation of evaluations) {
      if (!evaluation.agentId) continue;

      if (!groups.has(evaluation.agentId)) {
        groups.set(evaluation.agentId, []);
      }
      groups.get(evaluation.agentId)!.push(evaluation);
    }

    return groups;
  }

  private calculateSystematicBiasScore(
    agentScores: number[],
    allEvaluations: EvaluationResult[]
  ): number {
    const agentMean =
      agentScores.reduce((sum, score) => sum + score, 0) / agentScores.length;
    const overallMean =
      allEvaluations.reduce((sum, e) => sum + e.score, 0) /
      allEvaluations.length;

    const deviation = Math.abs(agentMean - overallMean);
    const overallStdDev = MathUtils.standardDeviation(
      allEvaluations.map((e) => e.score)
    );

    // Bias score is the deviation normalized by standard deviation
    return deviation / (overallStdDev + 0.001);
  }

  private createTimeWindows(
    history: EvaluationResult[],
    windowSize: number
  ): EvaluationResult[][] {
    const windows: EvaluationResult[][] = [];

    for (let i = 0; i <= history.length - windowSize; i += windowSize) {
      windows.push(history.slice(i, i + windowSize));
    }

    return windows;
  }

  private identifyTemporallyBiasedAgents(
    timeWindows: EvaluationResult[][]
  ): string[] {
    const agentVariances = new Map<string, number>();

    // Calculate variance for each agent across time windows
    for (const agentId of this.getAllAgentIds(timeWindows.flat())) {
      const agentScoresByWindow = timeWindows
        .map((window) => {
          const agentEvals = window.filter((e) => e.agentId === agentId);
          if (agentEvals.length === 0) return null;
          return (
            agentEvals.reduce((sum, e) => sum + e.score, 0) / agentEvals.length
          );
        })
        .filter((score) => score !== null) as number[];

      if (agentScoresByWindow.length >= 2) {
        agentVariances.set(agentId, MathUtils.variance(agentScoresByWindow));
      }
    }

    // Return agents with above-average variance
    const avgVariance =
      Array.from(agentVariances.values()).reduce((sum, v) => sum + v, 0) /
      agentVariances.size;
    return Array.from(agentVariances.entries())
      .filter(([, variance]) => variance > avgVariance * 1.5)
      .map(([agentId]) => agentId);
  }

  private identifyPositionallyBiasedAgents(
    evaluations: EvaluationResult[],
    contexts: EvaluationContext[]
  ): string[] {
    const agentDepthVariances = new Map<string, number>();

    // Group by agent and calculate depth-based variance
    for (const agentId of this.getAllAgentIds(evaluations)) {
      const agentEvaluations: Array<{ score: number; depth: number }> = [];

      for (let i = 0; i < evaluations.length; i++) {
        if (evaluations[i].agentId === agentId) {
          agentEvaluations.push({
            score: evaluations[i].score,
            depth: contexts[i].depth,
          });
        }
      }

      if (agentEvaluations.length >= 5) {
        // Calculate correlation between score and depth
        const scores = agentEvaluations.map((e) => e.score);
        const depths = agentEvaluations.map((e) => e.depth);
        const correlation = this.calculateCorrelation(scores, depths);

        agentDepthVariances.set(agentId, Math.abs(correlation));
      }
    }

    // Return agents with high score-depth correlation
    return Array.from(agentDepthVariances.entries())
      .filter(([, correlation]) => correlation > 0.6)
      .map(([agentId]) => agentId);
  }

  private getAllAgentIds(evaluations: EvaluationResult[]): string[] {
    const agentIds = new Set<string>();
    for (const evaluation of evaluations) {
      if (evaluation.agentId) {
        agentIds.add(evaluation.agentId);
      }
    }
    return Array.from(agentIds);
  }

  private calculateAutoCorrelation(values: number[]): number {
    if (values.length < 2) return 0;

    // Calculate correlation between values[0..n-2] and values[1..n-1]
    const x = values.slice(0, -1);
    const y = values.slice(1);

    return this.calculateCorrelation(x, y);
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const meanX = x.reduce((sum, val) => sum + val, 0) / x.length;
    const meanY = y.reduce((sum, val) => sum + val, 0) / y.length;

    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < x.length; i++) {
      const deltaX = x[i] - meanX;
      const deltaY = y[i] - meanY;
      numerator += deltaX * deltaY;
      denomX += deltaX * deltaX;
      denomY += deltaY * deltaY;
    }

    const denominator = Math.sqrt(denomX * denomY);
    return denominator === 0 ? 0 : numerator / denominator;
  }
}
