/**
 * Chess Domain - Entry point for chess-specific implementations
 */

export {
  ChessAction,
  PieceType,
  Color,
  type Square,
  type ChessPiece,
  MoveType,
} from "./chess-action";
export {
  ChessState,
  type ChessBoard,
  GameStatus,
  type CastlingRights,
} from "./chess-state";

// Re-import for internal use
import { ChessAction, PieceType, Color, Square } from "./chess-action";
import { ChessState } from "./chess-state";

/**
 * Chess utility functions
 */
export class ChessUtils {
  /**
   * Create a starting chess position
   */
  static createInitialState(): ChessState {
    return new ChessState();
  }

  /**
   * Parse algebraic notation to create a chess action
   */
  static parseAlgebraicNotation(
    notation: string,
    _state: ChessState
  ): ChessAction | null {
    // Simplified parser - in full implementation would handle all chess notation
    // For now, just return null to indicate parsing not implemented
    console.warn(`Chess notation parsing not yet implemented: ${notation}`);
    return null;
  }

  /**
   * Get piece value for evaluation
   */
  static getPieceValue(pieceType: PieceType): number {
    const values = {
      [PieceType.PAWN]: 1,
      [PieceType.KNIGHT]: 3,
      [PieceType.BISHOP]: 3,
      [PieceType.ROOK]: 5,
      [PieceType.QUEEN]: 9,
      [PieceType.KING]: 0,
    };
    return values[pieceType];
  }

  /**
   * Convert FEN notation to chess state
   */
  static fromFEN(fen: string): ChessState {
    // Simplified FEN parser - in full implementation would parse all FEN components
    console.warn(`FEN parsing not yet implemented: ${fen}`);
    return new ChessState();
  }

  /**
   * Get all squares on the chess board
   */
  static getAllSquares(): Square[] {
    const squares: Square[] = [];
    for (let rank = 1; rank <= 8; rank++) {
      for (let file = 0; file < 8; file++) {
        squares.push({
          file: String.fromCharCode(97 + file), // 'a' to 'h'
          rank,
        });
      }
    }
    return squares;
  }

  /**
   * Check if a square is a light square
   */
  static isLightSquare(square: Square): boolean {
    const fileIndex = square.file.charCodeAt(0) - 97;
    return (fileIndex + square.rank) % 2 !== 0;
  }

  /**
   * Get the opposite color
   */
  static getOppositeColor(color: Color): Color {
    return color === Color.WHITE ? Color.BLACK : Color.WHITE;
  }
}
