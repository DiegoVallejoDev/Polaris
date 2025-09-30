/**
 * Main Sentinel Agent implementation for POLARIS
 */

import { TreeNode } from "../core/node";
import { EvaluationResult, EvaluationContext } from "../types/evaluation";
import { SentinelConfig } from "../types/config";
import { BiasDetector, BiasReport, BiasDetectionConfig } from "./bias-detector";
import {
  DiversityAnalyzer,
  DiversityAnalysis,
  DiversityConfig,
} from "./diversity-analyzer";

/**
 * Sentinel evaluation result
 */
export interface SentinelEvaluation {
  /** Whether bias was detected */
  biasDetected: boolean;

  /** Overall diversity score (0-1) */
  diversityScore: number;

  /** Recommendations for improving evaluation quality */
  recommendations: string[];

  /** Score adjustments to apply to evaluations */
  scoreAdjustments: Record<string, number>;

  /** Confidence in the sentinel's analysis (0-1) */
  confidence: number;

  /** Additional metadata about the analysis */
  metadata: Record<string, any>;

  /** Detected bias reports */
  biasReports: BiasReport[];

  /** Detailed diversity analysis */
  diversityAnalysis: DiversityAnalysis;
}

/**
 * Context for sentinel analysis
 */
export interface SentinelAnalysisContext {
  /** Node being analyzed */
  node: TreeNode;

  /** Child nodes for comparison */
  children: TreeNode[];

  /** Current search depth */
  depth: number;

  /** Historical evaluations for temporal analysis */
  history: EvaluationResult[];

  /** Additional context data */
  contextData?: Record<string, any>;
}

/**
 * Main Sentinel Agent class - the meta-evaluator for POLARIS
 */
export class SentinelAgent {
  private config: SentinelConfig;
  private biasDetector: BiasDetector;
  private diversityAnalyzer: DiversityAnalyzer;
  private interventionCount: number;
  private analysisHistory: SentinelEvaluation[];

  constructor(config: SentinelConfig) {
    this.config = config;
    this.interventionCount = 0;
    this.analysisHistory = [];

    // Initialize bias detector
    const biasConfig: BiasDetectionConfig = {
      minEvaluations: 3,
      systematicBiasThreshold: 0.3,
      temporalBiasThreshold: 0.4,
      positionalBiasThreshold: 0.3,
      detectConfirmationBias: true,
      detectAnchoringBias: true,
      temporalWindow: 5,
    };
    this.biasDetector = new BiasDetector(biasConfig);

    // Initialize diversity analyzer
    const diversityConfig: DiversityConfig = {
      minEvaluations: 2,
      lowDiversityThreshold: config.diversityThreshold,
      groupthinkThreshold: 0.2,
      scoreWeight: 0.5,
      confidenceWeight: 0.3,
      reasoningWeight: 0.2,
    };
    this.diversityAnalyzer = new DiversityAnalyzer(diversityConfig);
  }

  /**
   * Main evaluation method - analyze a node and its children
   */
  async evaluate(
    context: SentinelAnalysisContext
  ): Promise<SentinelEvaluation> {
    const { node, children } = context;

    // Collect all evaluations from the node and its children
    const allEvaluations: EvaluationResult[] = [];
    const evaluationContexts: EvaluationContext[] = [];

    // Add node's evaluations
    for (const evaluation of node.agentEvaluations.values()) {
      allEvaluations.push(evaluation);
      evaluationContexts.push({
        stateId: node.state.id,
        depth: node.depth,
        availableActions: node.state.getValidActions().map((a) => a.id),
        evaluationHistory: context.history,
      });
    }

    // Add children's evaluations
    for (const child of children) {
      for (const evaluation of child.agentEvaluations.values()) {
        allEvaluations.push(evaluation);
        evaluationContexts.push({
          stateId: child.state.id,
          depth: child.depth,
          availableActions: child.state.getValidActions().map((a) => a.id),
          evaluationHistory: context.history,
        });
      }
    }

    // Perform bias detection
    const biasReports = await this.detectBias(
      allEvaluations,
      evaluationContexts
    );
    const biasDetected = biasReports.length > 0;

    // Perform diversity analysis
    const diversityAnalysis =
      this.diversityAnalyzer.analyzeDiversity(allEvaluations);

    // Calculate score adjustments
    const scoreAdjustments = this.calculateScoreAdjustments(
      allEvaluations,
      biasReports,
      diversityAnalysis
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      biasReports,
      diversityAnalysis
    );

    // Calculate overall confidence
    const confidence = this.calculateOverallConfidence(
      allEvaluations.length,
      diversityAnalysis.confidence,
      biasReports
    );

    // Create sentinel evaluation
    const sentinelEvaluation: SentinelEvaluation = {
      biasDetected,
      diversityScore: diversityAnalysis.overallScore,
      recommendations,
      scoreAdjustments,
      confidence,
      metadata: {
        evaluationCount: allEvaluations.length,
        nodeDepth: node.depth,
        childrenCount: children.length,
        interventionCount: this.interventionCount,
        timestamp: Date.now(),
      },
      biasReports,
      diversityAnalysis,
    };

    // Track intervention if significant adjustments are made
    if (this.isSignificantIntervention(sentinelEvaluation)) {
      this.interventionCount++;
    }

    // Store in history
    this.analysisHistory.push(sentinelEvaluation);
    this.maintainHistorySize();

    return sentinelEvaluation;
  }

  /**
   * Detect various types of bias in evaluations
   */
  async detectBias(
    evaluations: EvaluationResult[],
    contexts: EvaluationContext[]
  ): Promise<BiasReport[]> {
    if (!this.config.biasDetectionEnabled) {
      return [];
    }

    const biasReports: BiasReport[] = [];

    try {
      // Systematic bias detection
      const systematicBias =
        this.biasDetector.detectSystematicBias(evaluations);
      if (systematicBias) {
        biasReports.push(systematicBias);
      }

      // Temporal bias detection
      const temporalBias = this.biasDetector.detectTemporalBias(
        this.biasDetector.getHistory()
      );
      if (temporalBias) {
        biasReports.push(temporalBias);
      }

      // Positional bias detection
      if (contexts.length === evaluations.length) {
        const positionalBias = this.biasDetector.detectPositionalBias(
          evaluations,
          contexts
        );
        if (positionalBias) {
          biasReports.push(positionalBias);
        }
      }

      // Confirmation bias detection
      const confirmationBias =
        this.biasDetector.detectConfirmationBias(evaluations);
      if (confirmationBias) {
        biasReports.push(confirmationBias);
      }

      // Add evaluations to bias detector history
      for (const evaluation of evaluations) {
        this.biasDetector.addToHistory(evaluation);
      }
    } catch (error) {
      console.warn("Error during bias detection:", error);
    }

    return biasReports;
  }

  /**
   * Analyze diversity in evaluations
   */
  analyzeDiversity(evaluations: EvaluationResult[]): DiversityAnalysis {
    return this.diversityAnalyzer.analyzeDiversity(evaluations);
  }

  /**
   * Adjust scores based on detected bias and diversity issues
   */
  adjustScores(
    scores: number[],
    _context: EvaluationContext,
    sentinelEvaluation: SentinelEvaluation
  ): number[] {
    if (!this.shouldApplyAdjustments(sentinelEvaluation)) {
      return scores;
    }

    const adjustedScores = [...scores];
    const adjustmentStrength = this.config.correctionStrength;

    // Apply bias corrections
    for (const biasReport of sentinelEvaluation.biasReports) {
      for (let i = 0; i < adjustedScores.length; i++) {
        const adjustment = this.calculateBiasAdjustment(
          biasReport,
          adjustedScores[i]
        );
        adjustedScores[i] += adjustment * adjustmentStrength;
      }
    }

    // Apply diversity corrections
    if (sentinelEvaluation.diversityScore < this.config.diversityThreshold) {
      const diversityAdjustment = this.calculateDiversityAdjustment(
        adjustedScores,
        sentinelEvaluation.diversityAnalysis
      );

      for (let i = 0; i < adjustedScores.length; i++) {
        adjustedScores[i] += diversityAdjustment[i] * adjustmentStrength;
      }
    }

    // Clamp scores to reasonable range
    return adjustedScores.map((score) => Math.max(-2, Math.min(2, score)));
  }

  /**
   * Update sentinel configuration
   */
  updateConfig(config: Partial<SentinelConfig>): void {
    this.config = { ...this.config, ...config };

    // Update child component configurations
    if (config.diversityThreshold !== undefined) {
      this.diversityAnalyzer.updateConfig({
        lowDiversityThreshold: config.diversityThreshold,
      });
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): SentinelConfig {
    return { ...this.config };
  }

  /**
   * Get intervention statistics
   */
  getStatistics(): SentinelStatistics {
    return {
      totalAnalyses: this.analysisHistory.length,
      interventionCount: this.interventionCount,
      interventionRate:
        this.analysisHistory.length > 0
          ? this.interventionCount / this.analysisHistory.length
          : 0,
      averageDiversityScore: this.calculateAverageDiversityScore(),
      biasDetectionRate: this.calculateBiasDetectionRate(),
      averageConfidence: this.calculateAverageConfidence(),
      recentPerformance: this.getRecentPerformance(),
    };
  }

  /**
   * Clear analysis history
   */
  clearHistory(): void {
    this.analysisHistory = [];
    this.interventionCount = 0;
    this.biasDetector.clearHistory();
  }

  // Private helper methods

  private calculateScoreAdjustments(
    evaluations: EvaluationResult[],
    biasReports: BiasReport[],
    diversityAnalysis: DiversityAnalysis
  ): Record<string, number> {
    const adjustments: Record<string, number> = {};

    // Calculate adjustments based on bias reports
    for (const biasReport of biasReports) {
      for (const agentId of biasReport.affectedAgents) {
        const adjustment = this.calculateBiasAdjustmentForAgent(
          biasReport,
          agentId
        );
        adjustments[agentId] = (adjustments[agentId] || 0) + adjustment;
      }
    }

    // Calculate adjustments based on diversity
    if (diversityAnalysis.overallScore < this.config.diversityThreshold) {
      const diversityAdjustments = this.calculateDiversityAdjustmentsByAgent(
        evaluations,
        diversityAnalysis
      );

      for (const [agentId, adjustment] of Object.entries(
        diversityAdjustments
      )) {
        adjustments[agentId] = (adjustments[agentId] || 0) + adjustment;
      }
    }

    return adjustments;
  }

  private generateRecommendations(
    biasReports: BiasReport[],
    diversityAnalysis: DiversityAnalysis
  ): string[] {
    const recommendations: string[] = [];

    // Add bias-related recommendations
    for (const biasReport of biasReports) {
      recommendations.push(...biasReport.recommendations);
    }

    // Add diversity-related recommendations
    recommendations.push(...diversityAnalysis.recommendations);

    // Remove duplicates
    return Array.from(new Set(recommendations));
  }

  private calculateOverallConfidence(
    evaluationCount: number,
    diversityConfidence: number,
    biasReports: BiasReport[]
  ): number {
    // Base confidence on sample size
    const sampleConfidence = Math.min(evaluationCount / 5, 1.0);

    // Factor in diversity analysis confidence
    const diversityFactor = diversityConfidence;

    // Factor in bias detection confidence
    const biasConfidence =
      biasReports.length > 0
        ? biasReports.reduce((sum, report) => sum + report.confidence, 0) /
          biasReports.length
        : 0.8; // Default confidence when no bias detected

    return (sampleConfidence + diversityFactor + biasConfidence) / 3;
  }

  private shouldApplyAdjustments(
    sentinelEvaluation: SentinelEvaluation
  ): boolean {
    // Apply adjustments if confidence is high enough and significant issues detected
    return (
      sentinelEvaluation.confidence >=
        (this.config.interventionThreshold || 0.6) &&
      (sentinelEvaluation.biasDetected ||
        sentinelEvaluation.diversityScore < this.config.diversityThreshold)
    );
  }

  private calculateBiasAdjustment(
    biasReport: BiasReport,
    _score: number
  ): number {
    // Simple bias adjustment - can be made more sophisticated
    const severity = biasReport.severity;
    const direction = biasReport.biasType === "systematic" ? -0.1 : 0;

    return severity * direction;
  }

  private calculateDiversityAdjustment(
    scores: number[],
    diversityAnalysis: DiversityAnalysis
  ): number[] {
    // Add small random variations to increase diversity
    const adjustments = new Array(scores.length).fill(0);
    const diversityDeficit =
      this.config.diversityThreshold - diversityAnalysis.overallScore;

    if (diversityDeficit > 0) {
      for (let i = 0; i < adjustments.length; i++) {
        // Small random adjustment proportional to diversity deficit
        adjustments[i] = (Math.random() - 0.5) * diversityDeficit * 0.1;
      }
    }

    return adjustments;
  }

  private calculateBiasAdjustmentForAgent(
    biasReport: BiasReport,
    agentId: string
  ): number {
    // Calculate agent-specific bias adjustment
    const severity = biasReport.severity;
    const isAffected = biasReport.affectedAgents.includes(agentId);

    return isAffected ? -severity * 0.1 : 0;
  }

  private calculateDiversityAdjustmentsByAgent(
    evaluations: EvaluationResult[],
    _diversityAnalysis: DiversityAnalysis
  ): Record<string, number> {
    const adjustments: Record<string, number> = {};

    // Apply small adjustments to agents based on their contribution to diversity
    const agentCounts = new Map<string, number>();
    for (const evaluation of evaluations) {
      if (evaluation.agentId) {
        agentCounts.set(
          evaluation.agentId,
          (agentCounts.get(evaluation.agentId) || 0) + 1
        );
      }
    }

    // Adjust based on participation rate
    const totalEvaluations = evaluations.length;
    for (const [agentId, count] of agentCounts) {
      const participation = count / totalEvaluations;
      // Give slight boost to underrepresented agents
      adjustments[agentId] = participation < 0.2 ? 0.05 : 0;
    }

    return adjustments;
  }

  private isSignificantIntervention(
    sentinelEvaluation: SentinelEvaluation
  ): boolean {
    const maxAdjustment = Math.max(
      ...Object.values(sentinelEvaluation.scoreAdjustments).map(Math.abs)
    );

    return (
      sentinelEvaluation.biasDetected ||
      sentinelEvaluation.diversityScore <
        this.config.diversityThreshold * 0.8 ||
      maxAdjustment > (this.config.maxCorrection || 0.1)
    );
  }

  private maintainHistorySize(): void {
    const maxHistory = 100; // Keep last 100 analyses
    if (this.analysisHistory.length > maxHistory) {
      this.analysisHistory = this.analysisHistory.slice(-maxHistory);
    }
  }

  private calculateAverageDiversityScore(): number {
    if (this.analysisHistory.length === 0) return 0;

    const total = this.analysisHistory.reduce(
      (sum, analysis) => sum + analysis.diversityScore,
      0
    );

    return total / this.analysisHistory.length;
  }

  private calculateBiasDetectionRate(): number {
    if (this.analysisHistory.length === 0) return 0;

    const biasDetectionCount = this.analysisHistory.filter(
      (analysis) => analysis.biasDetected
    ).length;

    return biasDetectionCount / this.analysisHistory.length;
  }

  private calculateAverageConfidence(): number {
    if (this.analysisHistory.length === 0) return 0;

    const total = this.analysisHistory.reduce(
      (sum, analysis) => sum + analysis.confidence,
      0
    );

    return total / this.analysisHistory.length;
  }

  private getRecentPerformance(): RecentPerformance {
    const recentCount = Math.min(10, this.analysisHistory.length);
    if (recentCount === 0) {
      return { diversityTrend: 0, interventionTrend: 0, confidenceTrend: 0 };
    }

    const recent = this.analysisHistory.slice(-recentCount);

    // Calculate trends (simple linear regression slope)
    const diversityTrend = this.calculateTrend(
      recent.map((a) => a.diversityScore)
    );
    const interventionTrend = this.calculateTrend(
      recent.map((a) => (this.isSignificantIntervention(a) ? 1 : 0))
    );
    const confidenceTrend = this.calculateTrend(
      recent.map((a) => a.confidence)
    );

    return { diversityTrend, interventionTrend, confidenceTrend };
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const meanX = (n - 1) / 2;
    const meanY = values.reduce((sum, val) => sum + val, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (x[i] - meanX) * (values[i] - meanY);
      denominator += (x[i] - meanX) ** 2;
    }

    return denominator === 0 ? 0 : numerator / denominator;
  }
}

/**
 * Statistics about sentinel performance
 */
export interface SentinelStatistics {
  totalAnalyses: number;
  interventionCount: number;
  interventionRate: number;
  averageDiversityScore: number;
  biasDetectionRate: number;
  averageConfidence: number;
  recentPerformance: RecentPerformance;
}

/**
 * Recent performance trends
 */
export interface RecentPerformance {
  diversityTrend: number;
  interventionTrend: number;
  confidenceTrend: number;
}
