/**
 * Diversity analysis for the Sentinel Agent system
 */

import { EvaluationResult } from "../types/evaluation";
import { MathUtils } from "../utils/math";

/**
 * Configuration for diversity analysis
 */
export interface DiversityConfig {
  /** Minimum number of evaluations required for analysis */
  minEvaluations: number;

  /** Threshold for detecting low diversity (0-1) */
  lowDiversityThreshold: number;

  /** Threshold for detecting groupthink (0-1) */
  groupthinkThreshold: number;

  /** Weight for score diversity in overall analysis */
  scoreWeight: number;

  /** Weight for confidence diversity in overall analysis */
  confidenceWeight: number;

  /** Weight for reasoning diversity in overall analysis */
  reasoningWeight: number;
}

/**
 * Results of diversity analysis
 */
export interface DiversityAnalysis {
  /** Overall diversity score (0-1, higher is more diverse) */
  overallScore: number;

  /** Entropy of score distribution */
  entropy: number;

  /** Variance of scores */
  variance: number;

  /** Level of disagreement between agents (0-1) */
  disagreementLevel: number;

  /** Whether groupthink was detected */
  groupThinkDetected: boolean;

  /** Confidence in the diversity analysis (0-1) */
  confidence: number;

  /** Recommendations for improving diversity */
  recommendations: string[];

  /** Detailed breakdown of diversity metrics */
  breakdown: DiversityBreakdown;
}

/**
 * Detailed breakdown of diversity metrics
 */
export interface DiversityBreakdown {
  /** Score-based diversity metrics */
  scoreMetrics: {
    range: number;
    standardDeviation: number;
    coefficientOfVariation: number;
  };

  /** Confidence-based diversity metrics */
  confidenceMetrics: {
    range: number;
    standardDeviation: number;
    averageConfidence: number;
  };

  /** Agent participation metrics */
  participationMetrics: {
    totalAgents: number;
    activeAgents: number;
    participationRate: number;
    dominanceIndex: number;
  };

  /** Temporal diversity metrics */
  temporalMetrics?: {
    consistencyScore: number;
    trendStrength: number;
  };
}

/**
 * Analyzer for evaluation diversity and groupthink detection
 */
export class DiversityAnalyzer {
  private config: DiversityConfig;

  constructor(config: DiversityConfig) {
    this.config = config;
  }

  /**
   * Analyze diversity in a set of evaluations
   */
  analyzeDiversity(evaluations: EvaluationResult[]): DiversityAnalysis {
    if (evaluations.length < this.config.minEvaluations) {
      return this.createMinimalAnalysis(
        "Insufficient evaluations for diversity analysis"
      );
    }

    // Calculate core diversity metrics
    const scoreMetrics = this.calculateScoreMetrics(evaluations);
    const confidenceMetrics = this.calculateConfidenceMetrics(evaluations);
    const participationMetrics =
      this.calculateParticipationMetrics(evaluations);

    // Calculate overall diversity score
    const overallScore = this.calculateOverallDiversityScore(
      scoreMetrics,
      confidenceMetrics,
      participationMetrics
    );

    // Calculate entropy and variance
    const scores = evaluations.map((e) => e.score);
    const entropy = this.calculateNormalizedEntropy(scores);
    const variance = MathUtils.variance(scores);

    // Calculate disagreement level
    const disagreementLevel = this.calculateDisagreementLevel(evaluations);

    // Detect groupthink
    const groupThinkDetected = this.detectGroupthink(evaluations, overallScore);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      overallScore,
      groupThinkDetected,
      participationMetrics
    );

    // Calculate confidence in analysis
    const confidence = this.calculateAnalysisConfidence(
      evaluations.length,
      participationMetrics
    );

    return {
      overallScore,
      entropy,
      variance,
      disagreementLevel,
      groupThinkDetected,
      confidence,
      recommendations,
      breakdown: {
        scoreMetrics,
        confidenceMetrics,
        participationMetrics,
      },
    };
  }

  /**
   * Calculate a single diversity score for quick assessment
   */
  calculateDiversityScore(values: number[]): number {
    if (values.length < 2) return 0;

    // Combine multiple diversity measures
    const variance = MathUtils.variance(values);
    const entropy = this.calculateNormalizedEntropy(values);
    const range = Math.max(...values) - Math.min(...values);
    const normalizedRange = Math.min(range, 1.0); // Assume scores are roughly 0-1

    // Weighted combination
    return (
      0.4 * Math.min(variance * 4, 1) + // Variance (scaled)
      0.4 * entropy + // Entropy
      0.2 * normalizedRange
    ); // Range
  }

  /**
   * Identify if groupthink is occurring
   */
  identifyGroupThink(evaluations: EvaluationResult[]): boolean {
    return this.detectGroupthink(
      evaluations,
      this.calculateDiversityScore(evaluations.map((e) => e.score))
    );
  }

  /**
   * Measure disagreement between evaluations
   */
  measureDisagreement(evaluations: EvaluationResult[]): number {
    return this.calculateDisagreementLevel(evaluations);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<DiversityConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): DiversityConfig {
    return { ...this.config };
  }

  // Private helper methods

  private calculateScoreMetrics(
    evaluations: EvaluationResult[]
  ): DiversityBreakdown["scoreMetrics"] {
    const scores = evaluations.map((e) => e.score);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const standardDeviation = MathUtils.standardDeviation(scores);

    return {
      range: max - min,
      standardDeviation,
      coefficientOfVariation:
        mean !== 0 ? standardDeviation / Math.abs(mean) : 0,
    };
  }

  private calculateConfidenceMetrics(
    evaluations: EvaluationResult[]
  ): DiversityBreakdown["confidenceMetrics"] {
    const confidences = evaluations.map((e) => e.confidence);
    const min = Math.min(...confidences);
    const max = Math.max(...confidences);
    const average =
      confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;

    return {
      range: max - min,
      standardDeviation: MathUtils.standardDeviation(confidences),
      averageConfidence: average,
    };
  }

  private calculateParticipationMetrics(
    evaluations: EvaluationResult[]
  ): DiversityBreakdown["participationMetrics"] {
    // Count agent participation
    const agentCounts = new Map<string, number>();
    let totalAgents = 0;

    for (const evaluation of evaluations) {
      if (evaluation.agentId) {
        const count = agentCounts.get(evaluation.agentId) || 0;
        agentCounts.set(evaluation.agentId, count + 1);
        if (count === 0) totalAgents++;
      }
    }

    const activeAgents = agentCounts.size;
    const participationRate = totalAgents > 0 ? activeAgents / totalAgents : 0;

    // Calculate dominance index (how much the most active agent dominates)
    const evaluationCounts = Array.from(agentCounts.values());
    const maxCount = Math.max(...evaluationCounts);
    const dominanceIndex =
      evaluations.length > 0 ? maxCount / evaluations.length : 0;

    return {
      totalAgents,
      activeAgents,
      participationRate,
      dominanceIndex,
    };
  }

  private calculateOverallDiversityScore(
    scoreMetrics: DiversityBreakdown["scoreMetrics"],
    confidenceMetrics: DiversityBreakdown["confidenceMetrics"],
    participationMetrics: DiversityBreakdown["participationMetrics"]
  ): number {
    // Normalize score diversity (0-1)
    const scoreDiversity = Math.min(scoreMetrics.standardDeviation * 2, 1.0);

    // Normalize confidence diversity (0-1)
    const confidenceDiversity = Math.min(
      confidenceMetrics.standardDeviation * 4,
      1.0
    );

    // Agent participation diversity (inverse of dominance)
    const participationDiversity = 1 - participationMetrics.dominanceIndex;

    // Weighted combination
    return (
      this.config.scoreWeight * scoreDiversity +
      this.config.confidenceWeight * confidenceDiversity +
      (1 - this.config.scoreWeight - this.config.confidenceWeight) *
        participationDiversity
    );
  }

  private calculateNormalizedEntropy(values: number[]): number {
    if (values.length === 0) return 0;

    // Create histogram bins
    const bins = 10;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;

    if (range === 0) return 0; // All values are the same

    const histogram = new Array(bins).fill(0);

    for (const value of values) {
      const binIndex = Math.min(
        Math.floor(((value - min) / range) * bins),
        bins - 1
      );
      histogram[binIndex]++;
    }

    // Convert to probabilities
    const probabilities = histogram.map((count) => count / values.length);

    // Calculate entropy
    const entropy = MathUtils.entropy(probabilities);

    // Normalize by maximum possible entropy for this number of bins
    const maxEntropy = Math.log2(bins);

    return maxEntropy > 0 ? entropy / maxEntropy : 0;
  }

  private calculateDisagreementLevel(evaluations: EvaluationResult[]): number {
    if (evaluations.length < 2) return 0;

    const scores = evaluations.map((e) => e.score);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    // Calculate average absolute deviation from mean
    const avgDeviation =
      scores.reduce((sum, score) => sum + Math.abs(score - mean), 0) /
      scores.length;

    // Normalize to 0-1 range (assuming scores can vary by at most 2.0)
    return Math.min(avgDeviation / 1.0, 1.0);
  }

  private detectGroupthink(
    evaluations: EvaluationResult[],
    diversityScore: number
  ): boolean {
    // Groupthink indicators:
    // 1. Low diversity score
    // 2. High agreement (low variance)
    // 3. High average confidence despite agreement

    if (diversityScore > this.config.groupthinkThreshold) {
      return false; // Sufficient diversity
    }

    const scores = evaluations.map((e) => e.score);
    const confidences = evaluations.map((e) => e.confidence);

    const scoreVariance = MathUtils.variance(scores);
    const avgConfidence =
      confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;

    // Groupthink: low variance but high confidence
    const lowVariance = scoreVariance < 0.01; // Very low variance
    const highConfidence = avgConfidence > 0.8; // High average confidence

    return lowVariance && highConfidence;
  }

  private generateRecommendations(
    diversityScore: number,
    groupthinkDetected: boolean,
    participationMetrics: DiversityBreakdown["participationMetrics"]
  ): string[] {
    const recommendations: string[] = [];

    if (diversityScore < this.config.lowDiversityThreshold) {
      recommendations.push(
        "Increase agent diversity by adding agents with different parameters"
      );
      recommendations.push(
        "Consider using different selection strategies to promote diverse viewpoints"
      );
    }

    if (groupthinkDetected) {
      recommendations.push(
        "Groupthink detected - introduce contrarian agents or devil's advocate mechanisms"
      );
      recommendations.push(
        "Reduce agent similarity to encourage independent thinking"
      );
    }

    if (participationMetrics.dominanceIndex > 0.7) {
      recommendations.push(
        "One agent is dominating evaluations - balance agent selection"
      );
    }

    if (participationMetrics.participationRate < 0.5) {
      recommendations.push(
        "Low agent participation rate - ensure all agents are being utilized"
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        "Diversity levels are healthy - maintain current agent configuration"
      );
    }

    return recommendations;
  }

  private calculateAnalysisConfidence(
    evaluationCount: number,
    participationMetrics: DiversityBreakdown["participationMetrics"]
  ): number {
    // Confidence based on sample size and agent participation
    const sampleConfidence = Math.min(
      evaluationCount / this.config.minEvaluations,
      1.0
    );
    const participationConfidence = participationMetrics.participationRate;

    return (sampleConfidence + participationConfidence) / 2;
  }

  private createMinimalAnalysis(reason: string): DiversityAnalysis {
    return {
      overallScore: 0,
      entropy: 0,
      variance: 0,
      disagreementLevel: 0,
      groupThinkDetected: false,
      confidence: 0,
      recommendations: [reason],
      breakdown: {
        scoreMetrics: {
          range: 0,
          standardDeviation: 0,
          coefficientOfVariation: 0,
        },
        confidenceMetrics: {
          range: 0,
          standardDeviation: 0,
          averageConfidence: 0,
        },
        participationMetrics: {
          totalAgents: 0,
          activeAgents: 0,
          participationRate: 0,
          dominanceIndex: 0,
        },
      },
    };
  }
}
