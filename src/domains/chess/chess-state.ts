/**
 * Chess-specific GameState implementation
 */

import { BaseGameState } from "../base/game-state";
import {
  ChessAction,
  PieceType,
  Color,
  Square,
  ChessPiece,
  MoveType,
} from "./chess-action";
import { PolarisError } from "../../errors/base";

/**
 * Chess board representation
 */
export type ChessBoard = (ChessPiece | null)[][];

/**
 * Convert currentPlayer number to Color enum
 * Player 1 = WHITE, Player 2 = BLACK
 */
function playerToColor(player: number): Color {
  return player === 1 ? Color.WHITE : Color.BLACK;
}

/**
 * Chess game status
 */
export enum GameStatus {
  ACTIVE = "active",
  CHECK = "check",
  CHECKMATE = "checkmate",
  STALEMATE = "stalemate",
  DRAW_THREEFOLD = "draw_threefold",
  DRAW_FIFTY_MOVE = "draw_fifty_move",
  DRAW_INSUFFICIENT = "draw_insufficient",
  DRAW_AGREEMENT = "draw_agreement",
}

/**
 * Castling rights
 */
export interface CastlingRights {
  whiteKingside: boolean;
  whiteQueenside: boolean;
  blackKingside: boolean;
  blackQueenside: boolean;
}

/**
 * Chess-specific game state
 */
export class ChessState extends BaseGameState {
  private board: ChessBoard;
  private castlingRights: CastlingRights;
  private enPassantTarget: Square | null;
  private halfmoveClock: number; // For 50-move rule
  private fullmoveNumber: number;
  private gameStatus: GameStatus;
  private moveHistory: ChessAction[];
  private positionHistory: string[];

  constructor(
    id?: string,
    board?: ChessBoard,
    currentPlayer: Color = Color.WHITE,
    castlingRights?: CastlingRights,
    enPassantTarget?: Square | null,
    halfmoveClock: number = 0,
    fullmoveNumber: number = 1
  ) {
    const stateId = id || ChessState.generateStateId();
    const playerId = currentPlayer === Color.WHITE ? 1 : 2; // Map Color to PlayerId

    super(stateId, playerId);
    this.board = board || this.createInitialBoard();
    this.castlingRights = castlingRights || {
      whiteKingside: true,
      whiteQueenside: true,
      blackKingside: true,
      blackQueenside: true,
    };
    this.enPassantTarget = enPassantTarget || null;
    this.halfmoveClock = halfmoveClock;
    this.fullmoveNumber = fullmoveNumber;
    this.gameStatus = GameStatus.ACTIVE;
    this.moveHistory = [];
    this.positionHistory = [this.getFENPosition()];

    // Update derived properties
    this.updateGameStatus();
  }

  /**
   * Get the chess board
   */
  getBoard(): ChessBoard {
    return this.board.map((row) => [...row]);
  }

  /**
   * Get piece at a specific square
   */
  getPieceAt(square: Square): ChessPiece | null {
    const [file, rank] = this.squareToIndices(square);
    return this.board[rank][file];
  }

  /**
   * Get all pieces of a specific color
   */
  getPiecesOfColor(color: Color): ChessPiece[] {
    const pieces: ChessPiece[] = [];

    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = this.board[rank][file];
        if (piece && piece.color === color) {
          pieces.push(piece);
        }
      }
    }

    return pieces;
  }

  /**
   * Find the king of a specific color
   */
  findKing(color: Color): ChessPiece | null {
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = this.board[rank][file];
        if (piece && piece.type === PieceType.KING && piece.color === color) {
          return piece;
        }
      }
    }
    return null;
  }

  /**
   * Check if a square is under attack by the specified color
   */
  isSquareAttackedBy(square: Square, attackingColor: Color): boolean {
    const attackingPieces = this.getPiecesOfColor(attackingColor);

    for (const piece of attackingPieces) {
      if (this.canPieceAttackSquare(piece, square)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if the current player is in check
   */
  isInCheck(color?: Color): boolean {
    const kingColor = color || playerToColor(this.currentPlayer);
    const king = this.findKing(kingColor);

    if (!king) {
      return false;
    }

    const opponentColor = kingColor === Color.WHITE ? Color.BLACK : Color.WHITE;
    return this.isSquareAttackedBy(king.position, opponentColor);
  }

  /**
   * Get all legal actions for the current player
   */
  getAvailableActions(): ChessAction[] {
    const actions: ChessAction[] = [];
    const playerPieces = this.getPiecesOfColor(
      playerToColor(this.currentPlayer)
    );

    for (const piece of playerPieces) {
      const pieceActions = this.getLegalMovesForPiece(piece);
      actions.push(...pieceActions);
    }

    return actions;
  }

  /**
   * Apply an action to create a new state
   */
  applyAction(action: ChessAction): ChessState {
    if (!this.isActionValid(action)) {
      throw new PolarisError(`Invalid action: ${action.toString()}`);
    }

    // Create new board state
    const newBoard = this.board.map((row) => [...row]);
    const newCastlingRights = { ...this.castlingRights };
    let newEnPassantTarget: Square | null = null;
    let newHalfmoveClock = this.halfmoveClock + 1;
    let newFullmoveNumber = this.fullmoveNumber;

    // Handle the move
    this.executeMoveOnBoard(newBoard, action);

    // Update castling rights
    this.updateCastlingRights(newCastlingRights, action);

    // Handle en passant
    if (
      action.piece.type === PieceType.PAWN &&
      Math.abs(action.to.rank - action.from.rank) === 2
    ) {
      newEnPassantTarget = {
        file: action.from.file,
        rank: action.from.rank + (action.piece.color === Color.WHITE ? 1 : -1),
      };
    }

    // Reset halfmove clock on pawn move or capture
    if (action.piece.type === PieceType.PAWN || action.isCapture()) {
      newHalfmoveClock = 0;
    }

    // Increment fullmove number after black's move
    const currentColor = playerToColor(this.currentPlayer);
    if (currentColor === Color.BLACK) {
      newFullmoveNumber++;
    }

    // Create new state
    const nextPlayer = currentColor === Color.WHITE ? Color.BLACK : Color.WHITE;
    const newState = new ChessState(
      ChessState.generateStateId(),
      newBoard,
      nextPlayer,
      newCastlingRights,
      newEnPassantTarget,
      newHalfmoveClock,
      newFullmoveNumber
    );

    // Update move history
    newState.moveHistory = [...this.moveHistory, action];
    newState.positionHistory = [
      ...this.positionHistory,
      newState.getFENPosition(),
    ];

    return newState;
  }

  /**
   * Check if an action is valid in this state
   */
  isActionValid(action: ChessAction): boolean {
    // Basic validation
    if (!action.isValid()) {
      return false;
    }

    // Check if piece belongs to current player
    const currentColor = playerToColor(this.currentPlayer);
    if (action.piece.color !== currentColor) {
      return false;
    }

    // Check if piece is actually at the from square
    const pieceAtFrom = this.getPieceAt(action.from);
    if (!pieceAtFrom || !this.piecesEqual(pieceAtFrom, action.piece)) {
      return false;
    }

    // Check if destination is valid
    const pieceAtTo = this.getPieceAt(action.to);
    if (pieceAtTo && pieceAtTo.color === action.piece.color) {
      return false; // Can't capture own piece
    }

    // Check if move would leave king in check
    const testState = this.createTestState(action);
    if (testState.isInCheck(playerToColor(this.currentPlayer))) {
      return false;
    }

    return true;
  }

  /**
   * Get the current game status
   */
  getGameStatus(): GameStatus {
    return this.gameStatus;
  }

  /**
   * Check if the game is terminal
   */
  isGameTerminal(): boolean {
    return (
      this.gameStatus !== GameStatus.ACTIVE &&
      this.gameStatus !== GameStatus.CHECK
    );
  }

  /**
   * Get turn number
   */
  getTurnNumber(): number {
    return this.fullmoveNumber;
  }

  /**
   * Get valid actions (required by BaseGameState)
   */
  getValidActions(): ChessAction[] {
    return this.getAvailableActions();
  }

  /**
   * Get features for ML (required by BaseGameState)
   */
  getFeatures(): number[] {
    // Simple feature extraction - in full implementation would be more comprehensive
    const materialBalance = this.getMaterialBalance();
    return [materialBalance, this.fullmoveNumber, this.halfmoveClock];
  }

  /**
   * Get hash key (required by BaseGameState)
   */
  getHashKey(): string {
    return this.getFEN();
  }

  /**
   * Get game info (required by BaseGameState)
   */
  getGameInfo(): Record<string, any> {
    return {
      fen: this.getFEN(),
      gameStatus: this.gameStatus,
      materialBalance: this.getMaterialBalance(),
      castlingRights: this.castlingRights,
      enPassantTarget: this.enPassantTarget,
      halfmoveClock: this.halfmoveClock,
      fullmoveNumber: this.fullmoveNumber,
    };
  }

  /**
   * Serialize the state
   */
  serialize(): string {
    return JSON.stringify({
      id: this.id,
      currentPlayer: this.currentPlayer,
      board: this.board,
      castlingRights: this.castlingRights,
      enPassantTarget: this.enPassantTarget,
      halfmoveClock: this.halfmoveClock,
      fullmoveNumber: this.fullmoveNumber,
      gameStatus: this.gameStatus,
      moveHistory: this.moveHistory.map((move) => move.serialize()),
      fen: this.getFEN(),
    });
  }

  /**
   * Clone the state
   */
  clone(): ChessState {
    return new ChessState(
      undefined, // Generate new ID
      this.getBoard(),
      playerToColor(this.currentPlayer),
      { ...this.castlingRights },
      this.enPassantTarget ? { ...this.enPassantTarget } : null,
      this.halfmoveClock,
      this.fullmoveNumber
    );
  }

  /**
   * Get FEN (Forsyth-Edwards Notation) representation
   */
  getFEN(): string {
    const position = this.getFENPosition();
    const activeColor =
      playerToColor(this.currentPlayer) === Color.WHITE ? "w" : "b";
    const castling = this.getFENCastling();
    const enPassant = this.enPassantTarget
      ? `${this.enPassantTarget.file}${this.enPassantTarget.rank}`
      : "-";

    return `${position} ${activeColor} ${castling} ${enPassant} ${this.halfmoveClock} ${this.fullmoveNumber}`;
  }

  /**
   * Get material balance
   */
  getMaterialBalance(): number {
    const pieceValues = {
      [PieceType.PAWN]: 1,
      [PieceType.KNIGHT]: 3,
      [PieceType.BISHOP]: 3,
      [PieceType.ROOK]: 5,
      [PieceType.QUEEN]: 9,
      [PieceType.KING]: 0,
    };

    let whiteValue = 0;
    let blackValue = 0;

    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = this.board[rank][file];
        if (piece) {
          const value = pieceValues[piece.type];
          if (piece.color === Color.WHITE) {
            whiteValue += value;
          } else {
            blackValue += value;
          }
        }
      }
    }

    return whiteValue - blackValue;
  }

  // Private helper methods

  private createInitialBoard(): ChessBoard {
    const board: ChessBoard = Array(8)
      .fill(null)
      .map(() => Array(8).fill(null));

    // Place pawns
    for (let file = 0; file < 8; file++) {
      board[1][file] = {
        type: PieceType.PAWN,
        color: Color.WHITE,
        position: { file: String.fromCharCode(97 + file), rank: 2 },
      };
      board[6][file] = {
        type: PieceType.PAWN,
        color: Color.BLACK,
        position: { file: String.fromCharCode(97 + file), rank: 7 },
      };
    }

    // Place other pieces
    const pieceOrder = [
      PieceType.ROOK,
      PieceType.KNIGHT,
      PieceType.BISHOP,
      PieceType.QUEEN,
      PieceType.KING,
      PieceType.BISHOP,
      PieceType.KNIGHT,
      PieceType.ROOK,
    ];

    for (let file = 0; file < 8; file++) {
      board[0][file] = {
        type: pieceOrder[file],
        color: Color.WHITE,
        position: { file: String.fromCharCode(97 + file), rank: 1 },
      };
      board[7][file] = {
        type: pieceOrder[file],
        color: Color.BLACK,
        position: { file: String.fromCharCode(97 + file), rank: 8 },
      };
    }

    return board;
  }

  private squareToIndices(square: Square): [number, number] {
    const file = square.file.charCodeAt(0) - 97; // 'a' = 0, 'b' = 1, etc.
    const rank = square.rank - 1; // rank 1 = index 0, rank 2 = index 1, etc.
    return [file, 7 - rank]; // Flip rank for array indexing
  }

  private indicesToSquare(file: number, rank: number): Square {
    return {
      file: String.fromCharCode(97 + file),
      rank: 8 - rank,
    };
  }

  private canPieceAttackSquare(piece: ChessPiece, target: Square): boolean {
    // Simplified attack logic - in full implementation would handle all piece movement rules
    const dx = target.file.charCodeAt(0) - piece.position.file.charCodeAt(0);
    const dy = target.rank - piece.position.rank;

    switch (piece.type) {
      case PieceType.PAWN:
        const direction = piece.color === Color.WHITE ? 1 : -1;
        return Math.abs(dx) === 1 && dy === direction;

      case PieceType.KNIGHT:
        return (
          (Math.abs(dx) === 2 && Math.abs(dy) === 1) ||
          (Math.abs(dx) === 1 && Math.abs(dy) === 2)
        );

      case PieceType.BISHOP:
        return Math.abs(dx) === Math.abs(dy) && dx !== 0;

      case PieceType.ROOK:
        return (dx === 0 && dy !== 0) || (dx !== 0 && dy === 0);

      case PieceType.QUEEN:
        return Math.abs(dx) === Math.abs(dy) || dx === 0 || dy === 0;

      case PieceType.KING:
        return Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && (dx !== 0 || dy !== 0);

      default:
        return false;
    }
  }

  private getLegalMovesForPiece(_piece: ChessPiece): ChessAction[] {
    // Simplified move generation - in full implementation would handle all chess rules
    const moves: ChessAction[] = [];

    // This is a placeholder - full implementation would generate all legal moves
    // for each piece type considering board state, pins, checks, etc.

    return moves;
  }

  private executeMoveOnBoard(board: ChessBoard, action: ChessAction): void {
    const [fromFile, fromRank] = this.squareToIndices(action.from);
    const [toFile, toRank] = this.squareToIndices(action.to);

    // Move the piece
    board[toRank][toFile] = { ...action.piece, position: action.to };
    board[fromRank][fromFile] = null;

    // Handle special moves
    if (action.moveType === MoveType.EN_PASSANT) {
      // Remove captured pawn
      const capturedRank =
        action.piece.color === Color.WHITE ? toRank + 1 : toRank - 1;
      board[capturedRank][toFile] = null;
    }

    if (action.isCastling()) {
      // Move the rook
      if (action.moveType === MoveType.CASTLE_KINGSIDE) {
        const rookFromFile = 7;
        const rookToFile = 5;
        const rank = action.piece.color === Color.WHITE ? 0 : 7;
        board[rank][rookToFile] = board[rank][rookFromFile];
        board[rank][rookFromFile] = null;
        if (board[rank][rookToFile]) {
          board[rank][rookToFile]!.position = this.indicesToSquare(
            rookToFile,
            rank
          );
        }
      } else if (action.moveType === MoveType.CASTLE_QUEENSIDE) {
        const rookFromFile = 0;
        const rookToFile = 3;
        const rank = action.piece.color === Color.WHITE ? 0 : 7;
        board[rank][rookToFile] = board[rank][rookFromFile];
        board[rank][rookFromFile] = null;
        if (board[rank][rookToFile]) {
          board[rank][rookToFile]!.position = this.indicesToSquare(
            rookToFile,
            rank
          );
        }
      }
    }

    // Handle promotion
    if (action.isPromotion() && action.promotionPiece) {
      board[toRank][toFile]!.type = action.promotionPiece;
    }
  }

  private updateCastlingRights(
    rights: CastlingRights,
    action: ChessAction
  ): void {
    // King moves
    if (action.piece.type === PieceType.KING) {
      if (action.piece.color === Color.WHITE) {
        rights.whiteKingside = false;
        rights.whiteQueenside = false;
      } else {
        rights.blackKingside = false;
        rights.blackQueenside = false;
      }
    }

    // Rook moves
    if (action.piece.type === PieceType.ROOK) {
      if (action.piece.color === Color.WHITE) {
        if (action.from.file === "a" && action.from.rank === 1) {
          rights.whiteQueenside = false;
        } else if (action.from.file === "h" && action.from.rank === 1) {
          rights.whiteKingside = false;
        }
      } else {
        if (action.from.file === "a" && action.from.rank === 8) {
          rights.blackQueenside = false;
        } else if (action.from.file === "h" && action.from.rank === 8) {
          rights.blackKingside = false;
        }
      }
    }
  }

  private createTestState(action: ChessAction): ChessState {
    // Create a temporary state to test if move leaves king in check
    const testBoard = this.board.map((row) => [...row]);
    this.executeMoveOnBoard(testBoard, action);

    return new ChessState(
      undefined,
      testBoard,
      playerToColor(this.currentPlayer),
      { ...this.castlingRights },
      this.enPassantTarget,
      this.halfmoveClock,
      this.fullmoveNumber
    );
  }

  private updateGameStatus(): void {
    if (this.isInCheck()) {
      const legalMoves = this.getAvailableActions();
      if (legalMoves.length === 0) {
        this.gameStatus = GameStatus.CHECKMATE;
      } else {
        this.gameStatus = GameStatus.CHECK;
      }
    } else {
      const legalMoves = this.getAvailableActions();
      if (legalMoves.length === 0) {
        this.gameStatus = GameStatus.STALEMATE;
      } else if (this.halfmoveClock >= 100) {
        this.gameStatus = GameStatus.DRAW_FIFTY_MOVE;
      } else if (this.isThreefoldRepetition()) {
        this.gameStatus = GameStatus.DRAW_THREEFOLD;
      } else {
        this.gameStatus = GameStatus.ACTIVE;
      }
    }
  }

  private isThreefoldRepetition(): boolean {
    const currentPosition = this.getFENPosition();
    let count = 0;

    for (const position of this.positionHistory) {
      if (position === currentPosition) {
        count++;
        if (count >= 3) {
          return true;
        }
      }
    }

    return false;
  }

  private getFENPosition(): string {
    let fen = "";

    for (let rank = 7; rank >= 0; rank--) {
      let emptyCount = 0;

      for (let file = 0; file < 8; file++) {
        const piece = this.board[rank][file];

        if (piece) {
          if (emptyCount > 0) {
            fen += emptyCount.toString();
            emptyCount = 0;
          }

          let pieceChar = piece.type.charAt(0);
          if (piece.color === Color.WHITE) {
            pieceChar = pieceChar.toUpperCase();
          }

          fen += pieceChar;
        } else {
          emptyCount++;
        }
      }

      if (emptyCount > 0) {
        fen += emptyCount.toString();
      }

      if (rank > 0) {
        fen += "/";
      }
    }

    return fen;
  }

  private getFENCastling(): string {
    let castling = "";

    if (this.castlingRights.whiteKingside) castling += "K";
    if (this.castlingRights.whiteQueenside) castling += "Q";
    if (this.castlingRights.blackKingside) castling += "k";
    if (this.castlingRights.blackQueenside) castling += "q";

    return castling || "-";
  }

  private piecesEqual(piece1: ChessPiece, piece2: ChessPiece): boolean {
    return (
      piece1.type === piece2.type &&
      piece1.color === piece2.color &&
      piece1.position.file === piece2.position.file &&
      piece1.position.rank === piece2.position.rank
    );
  }

  protected static override generateStateId(): string {
    return `chess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
