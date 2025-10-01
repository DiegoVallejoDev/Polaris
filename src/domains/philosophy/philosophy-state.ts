/**
 * Philosophy domain state - represents the state of a philosophical discussion
 */

import { BaseGameState } from "../base/game-state";
import { Action } from "../base/action";
import { PlayerId } from "../../types/common";
import {
  PhilosophyAction,
  PhilosophyActionData,
  PhilosophicalStance,
} from "./philosophy-action";

/**
 * An argument made during the discussion
 */
export interface Argument {
  id: string;
  agentId: string;
  content: string;
  stance: PhilosophicalStance;
  confidence: number;
  reasoning: string;
  supports: string[]; // IDs of arguments this supports
  refutations: string[]; // IDs of arguments this refutes
  turnNumber: number;
}

/**
 * Discussion metrics and status
 */
export interface DiscussionMetrics {
  totalArguments: number;
  consensusLevel: number; // 0-1, how close to consensus
  diversityScore: number; // 0-1, how diverse the arguments are
  participationBalance: number; // 0-1, how evenly agents participate
  argumentQuality: number; // 0-1, average confidence of arguments
  turnsRemaining: number;
}

/**
 * State of a philosophical discussion
 */
export class PhilosophyState extends BaseGameState {
  public readonly question: string;
  public readonly arguments: Map<string, Argument>;
  public readonly participatingAgents: Set<string>;
  public readonly turnHistory: PhilosophyAction[];
  public readonly metrics: DiscussionMetrics;
  public readonly maxTurns: number;
  public readonly consensusThreshold: number;

  constructor(
    question: string,
    participatingAgents: Set<string>,
    currentPlayer: PlayerId = 1,
    maxTurns: number = 20,
    consensusThreshold: number = 0.8,
    argumentsMap: Map<string, Argument> = new Map(),
    turnHistory: PhilosophyAction[] = [],
    isTerminal: boolean = false,
    winner: PlayerId | undefined = undefined
  ) {
    const id = PhilosophyState.generateStateId();
    super(id, currentPlayer, isTerminal, winner);

    this.question = question;
    this.arguments = new Map(argumentsMap);
    this.participatingAgents = new Set(participatingAgents);
    this.turnHistory = [...turnHistory];
    this.maxTurns = maxTurns;
    this.consensusThreshold = consensusThreshold;
    this.metrics = this.calculateMetrics();
  }

  clone(): PhilosophyState {
    return new PhilosophyState(
      this.question,
      this.participatingAgents,
      this.currentPlayer,
      this.maxTurns,
      this.consensusThreshold,
      this.arguments,
      this.turnHistory,
      this.isTerminal,
      this.winner
    );
  }

  applyAction(action: Action): PhilosophyState {
    if (!(action instanceof PhilosophyAction)) {
      throw new Error("Action must be a PhilosophyAction");
    }

    if (this.isTerminal) {
      throw new Error("Cannot apply action to terminal state");
    }

    const newArguments = new Map(this.arguments);
    const newTurnHistory = [...this.turnHistory, action];
    let newIsTerminal: boolean = this.isTerminal;
    let newWinner = this.winner;

    // Add argument if it's a new argument
    if (["propose_argument", "synthesize"].includes(action.data.type)) {
      const argument: Argument = {
        id: action.id,
        agentId: action.data.agentId,
        content: action.data.content,
        stance: action.data.stance,
        confidence: action.data.confidence,
        reasoning: action.data.reasoning,
        supports: [],
        refutations: [],
        turnNumber: this.getTurnNumber() + 1,
      };
      newArguments.set(action.id, argument);
    }

    // Handle supporting or refuting existing arguments
    if (
      action.data.targetArgument &&
      newArguments.has(action.data.targetArgument)
    ) {
      const targetArg = newArguments.get(action.data.targetArgument)!;
      const updatedArg = { ...targetArg };

      if (action.data.type === "support_position") {
        updatedArg.supports.push(action.id);
      } else if (action.data.type === "refute_argument") {
        updatedArg.refutations.push(action.id);
      }

      newArguments.set(action.data.targetArgument, updatedArg);
    }

    // Check for consensus or termination
    if (
      action.data.type === "reach_consensus" ||
      newTurnHistory.length >= this.maxTurns
    ) {
      newIsTerminal = true;
      // Winner is determined by consensus quality
      newWinner = this.determineWinner(newArguments);
    }

    const nextPlayer = this.getNextPlayer(this.participatingAgents.size);

    return new PhilosophyState(
      this.question,
      this.participatingAgents,
      nextPlayer,
      this.maxTurns,
      this.consensusThreshold,
      newArguments,
      newTurnHistory,
      newIsTerminal,
      newWinner
    );
  }

  getValidActions(): PhilosophyAction[] {
    if (this.isTerminal) return [];

    const currentAgentId = Array.from(this.participatingAgents)[
      this.currentPlayer - 1
    ];
    const actions: PhilosophyAction[] = [];

    // Can always propose new arguments
    actions.push(this.createSampleAction("propose_argument", currentAgentId));

    // Can synthesize if there are multiple arguments with different stances
    if (this.hasOpposingStances()) {
      actions.push(this.createSampleAction("synthesize", currentAgentId));
    }

    // Can support or refute existing arguments
    for (const argument of this.arguments.values()) {
      if (argument.agentId !== currentAgentId) {
        actions.push(
          this.createSampleAction(
            "support_position",
            currentAgentId,
            argument.id
          )
        );
        actions.push(
          this.createSampleAction(
            "refute_argument",
            currentAgentId,
            argument.id
          )
        );
      }
    }

    // Can reach consensus if consensus level is high enough
    if (this.metrics.consensusLevel >= this.consensusThreshold) {
      actions.push(this.createSampleAction("reach_consensus", currentAgentId));
    }

    // Can ask for clarification
    actions.push(this.createSampleAction("ask_clarification", currentAgentId));

    return actions;
  }

  serialize(): string {
    return JSON.stringify({
      id: this.id,
      question: this.question,
      arguments: Array.from(this.arguments.entries()),
      participatingAgents: Array.from(this.participatingAgents),
      turnHistory: this.turnHistory.map((action) => action.serialize()),
      currentPlayer: this.currentPlayer,
      isTerminal: this.isTerminal,
      winner: this.winner,
      maxTurns: this.maxTurns,
      consensusThreshold: this.consensusThreshold,
    });
  }

  getFeatures(): number[] {
    const features: number[] = [];

    // Basic metrics
    features.push(this.metrics.consensusLevel);
    features.push(this.metrics.diversityScore);
    features.push(this.metrics.participationBalance);
    features.push(this.metrics.argumentQuality);
    features.push(this.metrics.turnsRemaining / this.maxTurns);

    // Stance distribution
    const stanceCounts = this.getStanceDistribution();
    features.push(stanceCounts.get("strongly_agree") || 0);
    features.push(stanceCounts.get("agree") || 0);
    features.push(stanceCounts.get("neutral") || 0);
    features.push(stanceCounts.get("disagree") || 0);
    features.push(stanceCounts.get("strongly_disagree") || 0);
    features.push(stanceCounts.get("synthesis") || 0);

    // Discussion dynamics
    features.push(this.arguments.size / Math.max(1, this.getTurnNumber()));
    features.push(this.countArgumentType("propose_argument"));
    features.push(this.countArgumentType("support_position"));
    features.push(this.countArgumentType("refute_argument"));
    features.push(this.countArgumentType("synthesize"));

    return features;
  }

  getHashKey(): string {
    const argumentHashes = Array.from(this.arguments.keys()).sort().join(",");
    const turnCount = this.turnHistory.length;
    return `phil_${this.question.length}_${argumentHashes}_${turnCount}_${this.currentPlayer}`;
  }

  getTurnNumber(): number {
    return this.turnHistory.length;
  }

  getGameInfo(): Record<string, any> {
    return {
      question: this.question,
      metrics: this.metrics,
      totalArguments: this.arguments.size,
      participatingAgents: Array.from(this.participatingAgents),
      stanceDistribution: Object.fromEntries(this.getStanceDistribution()),
      lastAction: this.turnHistory[this.turnHistory.length - 1]?.toString(),
      consensusReached: this.metrics.consensusLevel >= this.consensusThreshold,
    };
  }

  // Additional utility methods

  /**
   * Get the current level of consensus in the discussion
   */
  getConsensusLevel(): number {
    return this.metrics.consensusLevel;
  }

  /**
   * Check if the discussion has reached consensus
   */
  hasReachedConsensus(): boolean {
    return this.metrics.consensusLevel >= this.consensusThreshold;
  }

  /**
   * Get a summary of the discussion so far
   */
  getDiscussionSummary(): string {
    const summary = [];
    summary.push(`Question: ${this.question}`);
    summary.push(
      `Participants: ${Array.from(this.participatingAgents).join(", ")}`
    );
    summary.push(`Turn: ${this.getTurnNumber()}/${this.maxTurns}`);
    summary.push(`Arguments: ${this.arguments.size}`);
    summary.push(
      `Consensus Level: ${(this.metrics.consensusLevel * 100).toFixed(1)}%`
    );

    if (this.hasReachedConsensus()) {
      summary.push("✅ Consensus reached!");
    }

    return summary.join("\n");
  }

  /**
   * Get the dominant stance in the discussion
   */
  getDominantStance(): PhilosophicalStance {
    const stances = this.getStanceDistribution();
    let maxCount = 0;
    let dominantStance: PhilosophicalStance = "neutral";

    for (const [stance, count] of stances.entries()) {
      if (count > maxCount) {
        maxCount = count;
        dominantStance = stance as PhilosophicalStance;
      }
    }

    return dominantStance;
  }

  // Private helper methods

  private calculateMetrics(): DiscussionMetrics {
    const totalArguments = this.arguments.size;
    const consensusLevel = this.calculateConsensusLevel();
    const diversityScore = this.calculateDiversityScore();
    const participationBalance = this.calculateParticipationBalance();
    const argumentQuality = this.calculateArgumentQuality();
    const turnsRemaining = Math.max(0, this.maxTurns - this.getTurnNumber());

    return {
      totalArguments,
      consensusLevel,
      diversityScore,
      participationBalance,
      argumentQuality,
      turnsRemaining,
    };
  }

  private calculateConsensusLevel(): number {
    if (this.arguments.size === 0) return 0;

    const stances = this.getStanceDistribution();
    const dominantStanceCount = Math.max(...stances.values());
    const totalArguments = this.arguments.size;

    // Basic consensus metric: how many agree with the dominant stance
    let basicConsensus = dominantStanceCount / totalArguments;

    // Bonus for synthesis arguments
    const synthesisCount = stances.get("synthesis") || 0;
    const synthesisBonus = (synthesisCount / totalArguments) * 0.5;

    // Penalty for strong disagreements
    const strongDisagreement =
      (stances.get("strongly_disagree") || 0) / totalArguments;
    const disagreementPenalty = strongDisagreement * 0.3;

    return Math.max(
      0,
      Math.min(1, basicConsensus + synthesisBonus - disagreementPenalty)
    );
  }

  private calculateDiversityScore(): number {
    const stances = this.getStanceDistribution();
    const totalStances = stances.size;
    const maxPossibleStances = 7; // Number of possible stances

    // Shannon entropy for diversity
    let entropy = 0;
    const total = this.arguments.size;

    for (const count of stances.values()) {
      if (count > 0) {
        const p = count / total;
        entropy -= p * Math.log2(p);
      }
    }

    const maxEntropy = Math.log2(Math.min(totalStances, maxPossibleStances));
    return maxEntropy > 0 ? entropy / maxEntropy : 0;
  }

  private calculateParticipationBalance(): number {
    const agentCounts = new Map<string, number>();

    for (const argument of this.arguments.values()) {
      agentCounts.set(
        argument.agentId,
        (agentCounts.get(argument.agentId) || 0) + 1
      );
    }

    if (agentCounts.size === 0) return 1;

    const counts = Array.from(agentCounts.values());
    const average =
      counts.reduce((sum, count) => sum + count, 0) / counts.length;
    const variance =
      counts.reduce((sum, count) => sum + Math.pow(count - average, 2), 0) /
      counts.length;

    // Lower variance means better balance
    return 1 / (1 + variance);
  }

  private calculateArgumentQuality(): number {
    if (this.arguments.size === 0) return 0;

    const totalConfidence = Array.from(this.arguments.values()).reduce(
      (sum, arg) => sum + arg.confidence,
      0
    );

    return totalConfidence / this.arguments.size;
  }

  private getStanceDistribution(): Map<string, number> {
    const stances = new Map<string, number>();

    for (const argument of this.arguments.values()) {
      stances.set(argument.stance, (stances.get(argument.stance) || 0) + 1);
    }

    return stances;
  }

  private hasOpposingStances(): boolean {
    const stances = this.getStanceDistribution();
    const hasPositive = stances.has("agree") || stances.has("strongly_agree");
    const hasNegative =
      stances.has("disagree") || stances.has("strongly_disagree");
    return hasPositive && hasNegative;
  }

  private countArgumentType(type: string): number {
    return this.turnHistory.filter((action) => action.data.type === type)
      .length;
  }

  private determineWinner(
    _argumentsMap: Map<string, Argument>
  ): PlayerId | undefined {
    // Winner is determined by the quality of consensus reached
    const consensusLevel = this.calculateConsensusLevel();

    if (consensusLevel >= this.consensusThreshold) {
      // All participants win when consensus is reached
      return 1; // Could be extended to support multiple winners
    }

    return undefined; // No winner if no consensus
  }

  private createSampleAction(
    type: PhilosophyActionData["type"],
    agentId: string,
    targetArgument?: string
  ): PhilosophyAction {
    // Create a sample action for validation purposes
    const sampleData: PhilosophyActionData = {
      type,
      agentId,
      content: `Sample ${type} action`,
      stance: "neutral",
      confidence: 0.5,
      reasoning: "Sample reasoning",
      ...(targetArgument && { targetArgument }),
    };

    return new PhilosophyAction(sampleData);
  }

  /**
   * Create an initial philosophy discussion state
   */
  static createInitialState(
    question: string,
    participatingAgents: string[],
    maxTurns: number = 20,
    consensusThreshold: number = 0.8
  ): PhilosophyState {
    return new PhilosophyState(
      question,
      new Set(participatingAgents),
      1,
      maxTurns,
      consensusThreshold
    );
  }
}
