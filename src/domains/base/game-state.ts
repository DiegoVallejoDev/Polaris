/**
 * Base game state interface and implementation for all domains
 */

import { Identifiable, Serializable, Cloneable, Comparable, Hashable, PlayerId } from '../../types/common';
import { Action } from './action';

/**
 * Base interface that all game states must implement
 */
export interface GameState extends Identifiable, Serializable, Cloneable<GameState>, Comparable<GameState>, Hashable {
  /** Current player whose turn it is */
  readonly currentPlayer: PlayerId;
  
  /** Whether this state represents a terminal/end state */
  readonly isTerminal: boolean;
  
  /** Winner of the game (if terminal), undefined if draw or ongoing */
  readonly winner: PlayerId | undefined;
  
  /** Score for the current player (optional, domain-specific) */
  readonly score: number | undefined;
  
  /** Apply an action to this state and return the resulting state */
  applyAction(action: Action): GameState;
  
  /** Get all valid actions from this state */
  getValidActions(): Action[];
  
  /** Get features for ML/evaluation purposes */
  getFeatures(): number[];
  
  /** Check if the game is a draw */
  isDraw(): boolean;
  
  /** Get the current turn number */
  getTurnNumber(): number;
  
  /** Get game-specific information */
  getGameInfo(): Record<string, any>;
}

/**
 * Abstract base implementation of GameState
 * Provides common functionality for all game states
 */
export abstract class BaseGameState implements GameState {
  public readonly id: string;
  public readonly currentPlayer: PlayerId;
  public readonly isTerminal: boolean;
  public readonly winner: PlayerId | undefined;
  public readonly score: number | undefined;

  protected constructor(
    id: string,
    currentPlayer: PlayerId,
    isTerminal: boolean = false,
    winner: PlayerId | undefined = undefined,
    score: number | undefined = undefined
  ) {
    this.id = id;
    this.currentPlayer = currentPlayer;
    this.isTerminal = isTerminal;
    this.winner = winner;
    this.score = score;
  }

  // Abstract methods that must be implemented by concrete classes
  abstract clone(): GameState;
  abstract applyAction(action: Action): GameState;
  abstract getValidActions(): Action[];
  abstract serialize(): string;
  abstract getFeatures(): number[];
  abstract getHashKey(): string;
  abstract getTurnNumber(): number;
  abstract getGameInfo(): Record<string, any>;

  // Common implementations
  equals(other: GameState): boolean {
    return this.getHashKey() === other.getHashKey();
  }

  isDraw(): boolean {
    return this.isTerminal && this.winner === undefined;
  }

  toString(): string {
    return `${this.constructor.name}(player=${this.currentPlayer}, terminal=${this.isTerminal})`;
  }

  /**
   * Utility method to generate a unique ID for a state
   */
  protected static generateStateId(): string {
    return `state_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Utility method to switch to the next player
   */
  protected getNextPlayer(playerCount: number = 2): PlayerId {
    return (this.currentPlayer % playerCount) + 1;
  }

  /**
   * Utility method to check if a player has won
   */
  protected checkWinner(): PlayerId | undefined {
    // To be implemented by concrete classes
    return undefined;
  }
}