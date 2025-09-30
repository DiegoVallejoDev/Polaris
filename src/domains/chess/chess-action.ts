/**
 * Chess-specific Action implementation
 */

import { BaseAction, Action } from "../base/action";
import { PolarisError } from "../../errors/base";

/**
 * Chess piece types
 */
export enum PieceType {
  PAWN = "pawn",
  ROOK = "rook",
  KNIGHT = "knight",
  BISHOP = "bishop",
  QUEEN = "queen",
  KING = "king",
}

/**
 * Chess colors
 */
export enum Color {
  WHITE = "white",
  BLACK = "black",
}

/**
 * Chess square representation
 */
export interface Square {
  file: string; // 'a' to 'h'
  rank: number; // 1 to 8
}

/**
 * Chess piece representation
 */
export interface ChessPiece {
  type: PieceType;
  color: Color;
  position: Square;
  hasMoved?: boolean; // For castling and en passant
}

/**
 * Chess move types
 */
export enum MoveType {
  NORMAL = "normal",
  CAPTURE = "capture",
  CASTLE_KINGSIDE = "castle_kingside",
  CASTLE_QUEENSIDE = "castle_queenside",
  EN_PASSANT = "en_passant",
  PROMOTION = "promotion",
}

/**
 * Chess-specific action representing a move
 */
export class ChessAction extends BaseAction {
  public readonly from: Square;
  public readonly to: Square;
  public readonly moveType: MoveType;
  public readonly piece: ChessPiece;
  public readonly capturedPiece: ChessPiece | undefined;
  public readonly promotionPiece: PieceType | undefined;
  public readonly notation: string; // Algebraic notation

  constructor(
    from: Square,
    to: Square,
    piece: ChessPiece,
    moveType: MoveType = MoveType.NORMAL,
    capturedPiece?: ChessPiece,
    promotionPiece?: PieceType
  ) {
    const actionId = `${ChessAction.squareToString(from)}-${ChessAction.squareToString(to)}`;
    const actionType = "chess-move";
    const description = `Move ${piece.type} from ${ChessAction.squareToString(from)} to ${ChessAction.squareToString(to)}`;

    super(actionId, actionType, description);

    this.from = from;
    this.to = to;
    this.piece = piece;
    this.moveType = moveType;
    this.capturedPiece = capturedPiece;
    this.promotionPiece = promotionPiece;
    this.notation = this.generateAlgebraicNotation();

    // Validate the move construction
    this.validateMove();
  }

  /**
   * Check if this is a capture move
   */
  isCapture(): boolean {
    return (
      this.moveType === MoveType.CAPTURE ||
      this.moveType === MoveType.EN_PASSANT
    );
  }

  /**
   * Check if this is a castling move
   */
  isCastling(): boolean {
    return (
      this.moveType === MoveType.CASTLE_KINGSIDE ||
      this.moveType === MoveType.CASTLE_QUEENSIDE
    );
  }

  /**
   * Check if this is a promotion move
   */
  isPromotion(): boolean {
    return this.moveType === MoveType.PROMOTION;
  }

  /**
   * Get the distance moved (for analysis purposes)
   */
  getDistance(): number {
    const fileDistance = Math.abs(
      this.to.file.charCodeAt(0) - this.from.file.charCodeAt(0)
    );
    const rankDistance = Math.abs(this.to.rank - this.from.rank);
    return Math.max(fileDistance, rankDistance);
  }

  /**
   * Get the direction of the move
   */
  getDirection(): { file: number; rank: number } {
    const fileDirection =
      this.to.file.charCodeAt(0) - this.from.file.charCodeAt(0);
    const rankDirection = this.to.rank - this.from.rank;

    return {
      file: fileDirection === 0 ? 0 : fileDirection / Math.abs(fileDirection),
      rank: rankDirection === 0 ? 0 : rankDirection / Math.abs(rankDirection),
    };
  }

  /**
   * Check if move is diagonal
   */
  isDiagonal(): boolean {
    const direction = this.getDirection();
    return (
      Math.abs(direction.file) === Math.abs(direction.rank) &&
      Math.abs(direction.file) === 1
    );
  }

  /**
   * Check if move is straight (horizontal or vertical)
   */
  isStraight(): boolean {
    const direction = this.getDirection();
    return (
      (direction.file === 0 && direction.rank !== 0) ||
      (direction.file !== 0 && direction.rank === 0)
    );
  }

  /**
   * Clone this action
   */
  clone(): ChessAction {
    return new ChessAction(
      { ...this.from },
      { ...this.to },
      { ...this.piece },
      this.moveType,
      this.capturedPiece ? { ...this.capturedPiece } : undefined,
      this.promotionPiece
    );
  }

  /**
   * Check if this action is valid
   */
  isValid(): boolean {
    try {
      this.validateMove();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the cost/complexity of this move
   */
  getCost(): number {
    let cost = 1; // Base cost

    if (this.isCapture()) cost += 1;
    if (this.isCastling()) cost += 2;
    if (this.isPromotion()) cost += 3;

    return cost;
  }

  /**
   * Get action metadata
   */
  getMetadata(): Record<string, any> {
    return this.getAnalysisInfo();
  }

  /**
   * Get hash key for this action
   */
  getHashKey(): string {
    return `${this.id}-${this.moveType}-${this.promotionPiece || ""}`;
  }

  /**
   * Check equality with another action
   */
  equals(other: Action): boolean {
    if (!(other instanceof ChessAction)) {
      return false;
    }

    return (
      ChessAction.squaresEqual(this.from, other.from) &&
      ChessAction.squaresEqual(this.to, other.to) &&
      this.moveType === other.moveType &&
      this.piece.type === other.piece.type &&
      this.piece.color === other.piece.color &&
      this.promotionPiece === other.promotionPiece
    );
  }

  /**
   * Serialize to JSON string
   */
  serialize(): string {
    return JSON.stringify({
      id: this.id,
      type: this.type,
      description: this.description,
      from: this.from,
      to: this.to,
      moveType: this.moveType,
      piece: this.piece,
      capturedPiece: this.capturedPiece,
      promotionPiece: this.promotionPiece,
      notation: this.notation,
      isCapture: this.isCapture(),
      isCastling: this.isCastling(),
      isPromotion: this.isPromotion(),
    });
  }

  /**
   * Get detailed JSON representation
   */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      type: this.type,
      description: this.description,
      from: this.from,
      to: this.to,
      moveType: this.moveType,
      piece: this.piece,
      capturedPiece: this.capturedPiece,
      promotionPiece: this.promotionPiece,
      notation: this.notation,
      isCapture: this.isCapture(),
      isCastling: this.isCastling(),
      isPromotion: this.isPromotion(),
    };
  }

  /**
   * Get detailed move information for analysis
   */
  getAnalysisInfo(): Record<string, any> {
    return {
      ...this.toJSON(),
      distance: this.getDistance(),
      direction: this.getDirection(),
      isDiagonal: this.isDiagonal(),
      isStraight: this.isStraight(),
      developmentMove: this.isDevelopmentMove(),
      centerControl: this.controlsCenter(),
      kingSafety: this.affectsKingSafety(),
    };
  }

  /**
   * String representation
   */
  override toString(): string {
    return this.notation;
  }

  // Static utility methods

  /**
   * Convert square to string notation
   */
  static squareToString(square: Square): string {
    return `${square.file}${square.rank}`;
  }

  /**
   * Convert string notation to square
   */
  static stringToSquare(notation: string): Square {
    if (notation.length !== 2) {
      throw new PolarisError(`Invalid square notation: ${notation}`);
    }

    const file = notation[0];
    const rank = parseInt(notation[1]);

    if (file < "a" || file > "h" || rank < 1 || rank > 8) {
      throw new PolarisError(`Invalid square: ${notation}`);
    }

    return { file, rank };
  }

  /**
   * Check if two squares are equal
   */
  static squaresEqual(square1: Square, square2: Square): boolean {
    return square1.file === square2.file && square1.rank === square2.rank;
  }

  /**
   * Calculate distance between two squares
   */
  static squareDistance(square1: Square, square2: Square): number {
    const fileDistance = Math.abs(
      square2.file.charCodeAt(0) - square1.file.charCodeAt(0)
    );
    const rankDistance = Math.abs(square2.rank - square1.rank);
    return Math.max(fileDistance, rankDistance);
  }

  // Private helper methods

  private validateMove(): void {
    // Basic validation
    if (!this.isValidSquare(this.from)) {
      throw new PolarisError(
        `Invalid from square: ${ChessAction.squareToString(this.from)}`
      );
    }

    if (!this.isValidSquare(this.to)) {
      throw new PolarisError(
        `Invalid to square: ${ChessAction.squareToString(this.to)}`
      );
    }

    if (ChessAction.squaresEqual(this.from, this.to)) {
      throw new PolarisError("From and to squares cannot be the same");
    }

    // Validate piece is on the from square
    if (!ChessAction.squaresEqual(this.piece.position, this.from)) {
      throw new PolarisError("Piece position does not match from square");
    }

    // Validate promotion
    if (this.isPromotion() && !this.promotionPiece) {
      throw new PolarisError("Promotion move must specify promotion piece");
    }

    if (this.promotionPiece && !this.isPromotion()) {
      throw new PolarisError(
        "Promotion piece specified for non-promotion move"
      );
    }
  }

  private isValidSquare(square: Square): boolean {
    return (
      square.file >= "a" &&
      square.file <= "h" &&
      square.rank >= 1 &&
      square.rank <= 8
    );
  }

  private generateAlgebraicNotation(): string {
    // Simplified algebraic notation generation
    // In a full implementation, this would consider piece ambiguity, checks, etc.

    let notation = "";

    // Special moves
    if (this.moveType === MoveType.CASTLE_KINGSIDE) {
      return "O-O";
    }

    if (this.moveType === MoveType.CASTLE_QUEENSIDE) {
      return "O-O-O";
    }

    // Piece prefix (except for pawns)
    if (this.piece.type !== PieceType.PAWN) {
      notation += this.piece.type.charAt(0).toUpperCase();
    }

    // Capture notation
    if (this.isCapture()) {
      if (this.piece.type === PieceType.PAWN) {
        notation += this.from.file;
      }
      notation += "x";
    }

    // Destination square
    notation += ChessAction.squareToString(this.to);

    // Promotion
    if (this.isPromotion() && this.promotionPiece) {
      notation += "=" + this.promotionPiece.charAt(0).toUpperCase();
    }

    // En passant
    if (this.moveType === MoveType.EN_PASSANT) {
      notation += " e.p.";
    }

    return notation;
  }

  private isDevelopmentMove(): boolean {
    // Check if this move develops a piece from its starting position
    const startingRank = this.piece.color === Color.WHITE ? 1 : 8;
    const startingSecondRank = this.piece.color === Color.WHITE ? 2 : 7;

    return (
      (this.piece.type !== PieceType.PAWN && this.from.rank === startingRank) ||
      (this.piece.type === PieceType.PAWN &&
        this.from.rank === startingSecondRank)
    );
  }

  private controlsCenter(): boolean {
    // Check if the destination square controls the center (e4, e5, d4, d5)
    const centerSquares = ["e4", "e5", "d4", "d5"];
    const toSquare = ChessAction.squareToString(this.to);
    return centerSquares.includes(toSquare);
  }

  private affectsKingSafety(): boolean {
    // Simplified check - in full implementation would analyze actual king safety impact
    return (
      this.piece.type === PieceType.KING ||
      this.isCastling() ||
      (this.piece.type === PieceType.PAWN &&
        ((this.piece.color === Color.WHITE && this.from.rank === 2) ||
          (this.piece.color === Color.BLACK && this.from.rank === 7)))
    );
  }
}
