/**
 * Shapes of what the chess tools return, shared by the server-side analysis
 * and the chat UI that renders it.
 */

export type Side = "white" | "black";

/** An evaluation from White's point of view (positive favours White). */
export type Evaluation =
  | { type: "cp"; value: number }
  | { type: "mate"; value: number }
  | { type: "checkmate"; winner: Side }
  | { type: "draw" };

export interface PositionInput {
  fen?: string;
  pgn?: string;
  moves?: string[];
  /** With `pgn` or `moves`: use the position after this many half-moves. */
  ply?: number;
}

export interface PositionStatus {
  check: boolean;
  checkmate: boolean;
  stalemate: boolean;
  draw: boolean;
  gameOver: boolean;
}

export interface AnalysisLine {
  rank: number;
  evaluation: Evaluation;
  /** Human-readable evaluation, e.g. `+0.35` or `#-3`. */
  display: string;
  /** The line in standard algebraic notation. */
  moves: string[];
}

export interface PositionAnalysis {
  fen: string;
  sideToMove: Side;
  /** The board as eight rank strings, rank 8 first. */
  board: string[];
  evaluation: Evaluation;
  display: string;
  depth: number;
  /** The best move in SAN, and in UCI for drawing it on a board. */
  bestMove: string | null;
  bestMoveUci: string | null;
  lines: AnalysisLine[];
  legalMoves: string[];
  status: PositionStatus;
  analysisUrl: string;
  note: string;
}

export interface MoveRecord {
  ply: number;
  moveNumber: number;
  side: Side;
  san: string;
  uci: string;
  fen: string;
}

export interface MovesResult {
  startFen: string;
  fen: string;
  sideToMove: Side;
  moves: MoveRecord[];
  board: string[];
  legalMoves: string[];
  status: PositionStatus;
  pgn: string;
  analysisUrl: string;
}

export type MoveClassification = "best" | "good" | "inaccuracy" | "mistake" | "blunder" | "forced";

export interface AnalysedMove {
  ply: number;
  moveNumber: number;
  side: Side;
  san: string;
  evaluationBefore: string;
  evaluationAfter: string;
  bestMove: string;
  centipawnLoss: number;
  classification: MoveClassification;
  fenBefore: string;
}

export interface GameAnalysis {
  plies: number;
  analysedPlies: { from: number; to: number };
  /** True when the time budget ran out before the end of the requested range. */
  truncated: boolean;
  depth: number;
  finalEvaluation: string;
  accuracy: Record<Side, number | null>;
  counts: Record<Side, { inaccuracies: number; mistakes: number; blunders: number }>;
  criticalMoments: AnalysedMove[];
  moves: AnalysedMove[];
  note: string;
}
