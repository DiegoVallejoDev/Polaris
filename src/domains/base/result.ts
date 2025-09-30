/**
 * Result types for game outcomes and evaluations
 */

import { PlayerId, Score, Confidence } from '../../types/common';

/**
 * Result of a completed game
 */
export interface GameResult {
  /** Whether the game is finished */
  isComplete: boolean;
  
  /** Winner of the game (undefined for draw) */
  winner: PlayerId | undefined;
  
  /** Final scores for each player */
  scores: Map<PlayerId, Score>;
  
  /** Number of turns played */
  turnCount: number;
  
  /** Reason for game ending */
  endReason: GameEndReason;
  
  /** Additional metadata about the result */
  metadata?: Record<string, any>;
}

/**
 * Reasons why a game might end
 */
export enum GameEndReason {
  CHECKMATE = 'checkmate',
  STALEMATE = 'stalemate',
  RESIGNATION = 'resignation',
  TIMEOUT = 'timeout',
  DRAW_AGREEMENT = 'draw_agreement',
  INSUFFICIENT_MATERIAL = 'insufficient_material',
  THREEFOLD_REPETITION = 'threefold_repetition',
  FIFTY_MOVE_RULE = 'fifty_move_rule',
  MAX_TURNS_REACHED = 'max_turns_reached',
  CUSTOM = 'custom'
}

/**
 * Outcome of a single move or action
 */
export interface MoveResult {
  /** Whether the move was successful */
  success: boolean;
  
  /** New game state after the move */
  newState?: any; // Will be GameState, avoiding circular import
  
  /** Error message if move failed */
  error?: string;
  
  /** Additional information about the move */
  metadata?: Record<string, any>;
}

/**
 * Analysis result for a position
 */
export interface PositionAnalysis {
  /** Evaluation score */
  score: Score;
  
  /** Confidence in the evaluation */
  confidence: Confidence;
  
  /** Best line of play */
  principalVariation: any[]; // Array of actions
  
  /** Depth of analysis */
  depth: number;
  
  /** Time spent on analysis */
  analysisTime: number;
  
  /** Additional insights */
  insights?: string[];
}