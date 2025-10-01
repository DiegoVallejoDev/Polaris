/**
 * Philosophy domain actions - represents philosophical arguments and positions
 */

import { Action } from "../base/action";

/**
 * Types of philosophical actions
 */
export type PhilosophyActionType =
  | "propose_argument" // Propose a new argument
  | "support_position" // Support an existing position
  | "refute_argument" // Refute an existing argument
  | "synthesize" // Propose a synthesis of positions
  | "ask_clarification" // Ask for clarification
  | "concede_point" // Concede a specific point
  | "reach_consensus"; // Declare consensus reached

/**
 * Philosophical stance on the question
 */
export type PhilosophicalStance =
  | "strongly_agree"
  | "agree"
  | "neutral"
  | "disagree"
  | "strongly_disagree"
  | "synthesis"
  | "unclear";

/**
 * Action in a philosophical discussion
 */
export interface PhilosophyActionData {
  type: PhilosophyActionType;
  agentId: string;
  content: string;
  stance: PhilosophicalStance;
  targetArgument?: string; // For refutations or supports
  confidence: number; // 0-1
  reasoning: string;
  evidence?: string[];
}

/**
 * Philosophy action implementation
 */
export class PhilosophyAction implements Action {
  public readonly id: string;
  public readonly type: string;
  public readonly description: string;
  public readonly data: PhilosophyActionData;

  constructor(data: PhilosophyActionData) {
    this.id = `phil_action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.data = { ...data };
    this.type = data.type;
    this.description = `${data.agentId}: ${data.content.substring(0, 100)}${data.content.length > 100 ? "..." : ""}`;
  }

  clone(): PhilosophyAction {
    return new PhilosophyAction(this.data);
  }

  serialize(): string {
    return JSON.stringify({
      id: this.id,
      type: this.type,
      description: this.description,
      data: this.data,
    });
  }

  getHashKey(): string {
    return `${this.data.type}_${this.data.agentId}_${this.data.stance}_${this.data.content.length}`;
  }

  equals(other: Action): boolean {
    if (!(other instanceof PhilosophyAction)) return false;
    return this.getHashKey() === other.getHashKey();
  }

  isValid(): boolean {
    return !!(this.data.content && this.data.agentId && this.data.reasoning);
  }

  getCost(): number {
    // Cost based on complexity and confidence
    const baseComplexity = this.data.content.length / 100;
    const typeComplexity =
      {
        propose_argument: 1.0,
        support_position: 0.6,
        refute_argument: 0.8,
        synthesize: 1.5,
        ask_clarification: 0.3,
        concede_point: 0.4,
        reach_consensus: 2.0,
      }[this.data.type] || 1.0;

    return baseComplexity * typeComplexity * (2 - this.data.confidence);
  }

  getMetadata(): Record<string, any> {
    return {
      agentId: this.data.agentId,
      stance: this.data.stance,
      confidence: this.data.confidence,
      actionType: this.data.type,
      targetArgument: this.data.targetArgument,
      evidence: this.data.evidence,
      contentLength: this.data.content.length,
      reasoningLength: this.data.reasoning.length,
    };
  }

  toString(): string {
    const { type, agentId, stance, content } = this.data;
    return `${agentId}: [${type}] ${stance} - "${content.substring(0, 50)}${content.length > 50 ? "..." : ""}"`;
  }

  /**
   * Get the weight/importance of this action
   */
  getWeight(): number {
    const baseWeight =
      {
        propose_argument: 0.8,
        support_position: 0.6,
        refute_argument: 0.7,
        synthesize: 0.9,
        ask_clarification: 0.3,
        concede_point: 0.5,
        reach_consensus: 1.0,
      }[this.data.type] || 0.5;

    return baseWeight * this.data.confidence;
  }

  /**
   * Check if this action moves toward consensus
   */
  isConsensusBuilding(): boolean {
    return ["synthesize", "concede_point", "reach_consensus"].includes(
      this.data.type
    );
  }

  /**
   * Check if this action creates disagreement
   */
  isArgumentative(): boolean {
    return ["refute_argument", "propose_argument"].includes(this.data.type);
  }

  /**
   * Get the semantic similarity to another action (simplified)
   */
  getSemanticSimilarity(other: PhilosophyAction): number {
    if (this.data.stance === other.data.stance) return 0.8;
    if (this.data.type === other.data.type) return 0.6;
    return 0.2;
  }
}

/**
 * Utility functions for creating philosophy actions
 */
export class PhilosophyActionFactory {
  static createArgument(
    agentId: string,
    content: string,
    stance: PhilosophicalStance,
    reasoning: string,
    confidence: number = 0.8
  ): PhilosophyAction {
    return new PhilosophyAction({
      type: "propose_argument",
      agentId,
      content,
      stance,
      reasoning,
      confidence,
    });
  }

  static createSupport(
    agentId: string,
    content: string,
    targetArgument: string,
    reasoning: string,
    confidence: number = 0.7
  ): PhilosophyAction {
    return new PhilosophyAction({
      type: "support_position",
      agentId,
      content,
      stance: "agree",
      targetArgument,
      reasoning,
      confidence,
    });
  }

  static createRefutation(
    agentId: string,
    content: string,
    targetArgument: string,
    reasoning: string,
    confidence: number = 0.7
  ): PhilosophyAction {
    return new PhilosophyAction({
      type: "refute_argument",
      agentId,
      content,
      stance: "disagree",
      targetArgument,
      reasoning,
      confidence,
    });
  }

  static createSynthesis(
    agentId: string,
    content: string,
    reasoning: string,
    confidence: number = 0.9
  ): PhilosophyAction {
    return new PhilosophyAction({
      type: "synthesize",
      agentId,
      content,
      stance: "synthesis",
      reasoning,
      confidence,
    });
  }

  static createConsensus(
    agentId: string,
    content: string,
    reasoning: string,
    confidence: number = 1.0
  ): PhilosophyAction {
    return new PhilosophyAction({
      type: "reach_consensus",
      agentId,
      content,
      stance: "synthesis",
      reasoning,
      confidence,
    });
  }
}
