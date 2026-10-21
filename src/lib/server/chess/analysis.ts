import { Chess, validateFen, type Move } from "chess.js";
import type { EngineScore, SearchOptions, SearchResult } from "./uci-engine";

/** Runs one engine search; the pool provides it, tests fake it. */
export type Search = (options: SearchOptions) => Promise<SearchResult>;

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
  bestMove: string | null;
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

export class ChessInputError extends Error {}

export const LIMITS = {
  depth: { min: 6, max: 24, default: 18 },
  multiPv: { min: 1, max: 5, default: 3 },
  /** Wall-clock cap on one position search. */
  searchTimeMs: 8_000,
  /** Per-ply search time for game analysis. */
  movetimeMs: { min: 100, max: 1_000, default: 250 },
  /** Total engine time for one game analysis. */
  gameBudgetMs: 30_000,
  maxPgnBytes: 20_000,
  maxMoves: 600
};

const MATE_CP = 1_000;

/** Lichess's win-percentage curve, used for accuracy. */
function winPercent(cp: number): number {
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sideOf(chess: Chess): Side {
  return chess.turn() === "w" ? "white" : "black";
}

function statusOf(chess: Chess): PositionStatus {
  return {
    check: chess.inCheck(),
    checkmate: chess.isCheckmate(),
    stalemate: chess.isStalemate(),
    draw: chess.isDraw(),
    gameOver: chess.isGameOver()
  };
}

function boardOf(chess: Chess): string[] {
  return chess
    .ascii()
    .split("\n")
    .map((line) => line.trimEnd());
}

export function analysisUrl(fen: string): string {
  return `https://lichess.org/analysis/${fen.replace(/ /g, "_")}`;
}

/** Converts the engine's side-to-move score to White's point of view. */
export function toWhitePerspective(score: EngineScore, sideToMove: Side): Evaluation {
  const sign = sideToMove === "white" ? 1 : -1;
  return { type: score.type, value: score.value * sign };
}

export function terminalEvaluation(chess: Chess): Evaluation | null {
  if (chess.isCheckmate())
    return { type: "checkmate", winner: sideOf(chess) === "white" ? "black" : "white" };
  if (chess.isDraw() || chess.isStalemate()) return { type: "draw" };
  return null;
}

export function formatEvaluation(evaluation: Evaluation): string {
  switch (evaluation.type) {
    case "cp": {
      const pawns = evaluation.value / 100;
      return `${pawns > 0 ? "+" : pawns < 0 ? "-" : ""}${Math.abs(pawns).toFixed(2)}`;
    }
    case "mate":
      return evaluation.value > 0 ? `#${evaluation.value}` : `#-${Math.abs(evaluation.value)}`;
    case "checkmate":
      return `checkmate, ${evaluation.winner === "white" ? "White" : "Black"} wins`;
    case "draw":
      return "draw";
  }
}

/** Centipawn equivalent used for loss and accuracy, with mates capped. */
function toCentipawns(evaluation: Evaluation): number {
  switch (evaluation.type) {
    case "cp":
      return clamp(evaluation.value, -MATE_CP, MATE_CP);
    case "mate":
      return evaluation.value > 0 ? MATE_CP : -MATE_CP;
    case "checkmate":
      return evaluation.winner === "white" ? MATE_CP : -MATE_CP;
    case "draw":
      return 0;
  }
}

/** Applies a move given in SAN or UCI notation; returns null when illegal. */
export function applyMove(chess: Chess, text: string): Move | null {
  const move = text.trim();
  if (!move) return null;
  try {
    return chess.move(move);
  } catch {
    const uci = /^([a-h][1-8])([a-h][1-8])([qrbnQRBN])?$/.exec(move);
    if (!uci) return null;
    try {
      return chess.move({ from: uci[1], to: uci[2], promotion: uci[3]?.toLowerCase() });
    } catch {
      return null;
    }
  }
}

/** The position described by the input, and the moves that led there. */
export function resolvePosition(input: PositionInput): { chess: Chess; history: Move[] } {
  const { fen, pgn, moves, ply } = input;
  if (fen !== undefined) {
    if (pgn !== undefined || moves !== undefined) {
      throw new ChessInputError(
        "Give the position as a FEN, a PGN or a list of moves, not several."
      );
    }
    const result = validateFen(fen.trim());
    if (!result.ok) throw new ChessInputError(result.error ?? "Invalid FEN");
    return { chess: new Chess(fen.trim()), history: [] };
  }

  const chess = new Chess();
  if (pgn !== undefined) {
    if (moves !== undefined) {
      throw new ChessInputError("Give the game as a PGN or a list of moves, not both.");
    }
    if (pgn.length > LIMITS.maxPgnBytes) throw new ChessInputError("The PGN is too long.");
    try {
      chess.loadPgn(pgn.trim());
    } catch (error) {
      throw new ChessInputError(
        `Could not parse the PGN: ${error instanceof Error ? error.message : "unknown error"}`
      );
    }
  } else if (moves !== undefined) {
    if (moves.length > LIMITS.maxMoves) throw new ChessInputError("Too many moves.");
    moves.forEach((text, index) => {
      if (!applyMove(chess, text)) {
        throw new ChessInputError(
          `Move ${index + 1} (${text}) is illegal in position ${chess.fen()}. Legal moves: ${chess.moves().join(", ")}`
        );
      }
    });
  } else {
    throw new ChessInputError("Give a position as a FEN, a PGN or a list of moves.");
  }

  const history = chess.history({ verbose: true });
  if (ply !== undefined) {
    if (!Number.isInteger(ply) || ply < 0 || ply > history.length) {
      throw new ChessInputError(`ply must be between 0 and ${history.length} for this game.`);
    }
    const truncated = new Chess(history[0]?.before ?? chess.fen());
    for (const move of history.slice(0, ply)) truncated.move(move.san);
    return { chess: truncated, history: history.slice(0, ply) };
  }
  return { chess, history };
}

/** Replays a UCI principal variation from `fen` and returns it in SAN. */
export function pvToSan(fen: string, pv: string[]): string[] {
  const chess = new Chess(fen);
  const san: string[] = [];
  for (const uci of pv) {
    const move = applyMove(chess, uci);
    if (!move) break;
    san.push(move.san);
  }
  return san;
}

export interface AnalyzePositionOptions {
  depth?: number;
  multiPv?: number;
  signal?: AbortSignal;
}

export async function analyzePosition(
  input: PositionInput,
  { depth, multiPv, signal }: AnalyzePositionOptions,
  search: Search
): Promise<PositionAnalysis> {
  const { chess } = resolvePosition(input);
  const fen = chess.fen();
  const sideToMove = sideOf(chess);
  const base = {
    fen,
    sideToMove,
    board: boardOf(chess),
    legalMoves: chess.moves(),
    status: statusOf(chess),
    analysisUrl: analysisUrl(fen),
    note: "Evaluations are from White's point of view: positive favours White, negative favours Black. Lines are in standard algebraic notation."
  };

  const terminal = terminalEvaluation(chess);
  if (terminal) {
    return {
      ...base,
      evaluation: terminal,
      display: formatEvaluation(terminal),
      depth: 0,
      bestMove: null,
      lines: []
    };
  }

  const wantedDepth = clamp(depth ?? LIMITS.depth.default, LIMITS.depth.min, LIMITS.depth.max);
  const result = await search({
    fen,
    depth: wantedDepth,
    movetimeMs: LIMITS.searchTimeMs,
    multiPv: clamp(multiPv ?? LIMITS.multiPv.default, LIMITS.multiPv.min, LIMITS.multiPv.max),
    signal,
    timeoutMs: LIMITS.searchTimeMs + 5_000
  });

  const lines: AnalysisLine[] = result.lines.map((line) => {
    const evaluation = toWhitePerspective(line.score, sideToMove);
    return {
      rank: line.multipv,
      evaluation,
      display: formatEvaluation(evaluation),
      moves: pvToSan(fen, line.pv)
    };
  });
  const best = lines[0];
  const bestMove = best?.moves[0] ?? (result.bestMove ? pvToSan(fen, [result.bestMove])[0] : null);
  const evaluation: Evaluation = best?.evaluation ?? { type: "cp", value: 0 };

  return {
    ...base,
    evaluation,
    display: formatEvaluation(evaluation),
    depth: result.depth,
    bestMove: bestMove ?? null,
    lines
  };
}

export interface MakeMovesInput {
  fen?: string;
  pgn?: string;
  moves: string[];
}

/** Plays moves from a position, checking each one is legal. No engine involved. */
export function makeMoves({ fen, pgn, moves }: MakeMovesInput): MovesResult {
  const { chess } =
    fen !== undefined || pgn !== undefined ? resolvePosition({ fen, pgn }) : { chess: new Chess() };
  const startFen = chess.fen();
  if (moves.length > LIMITS.maxMoves) throw new ChessInputError("Too many moves.");

  const records: MoveRecord[] = [];
  moves.forEach((text, index) => {
    const moveNumber = chess.moveNumber();
    const side = sideOf(chess);
    const move = applyMove(chess, text);
    if (!move) {
      throw new ChessInputError(
        `Move ${index + 1} (${text}) is illegal for ${side} in position ${chess.fen()}. Legal moves: ${chess.moves().join(", ")}`
      );
    }
    records.push({
      ply: index + 1,
      moveNumber,
      side,
      san: move.san,
      uci: move.lan,
      fen: move.after
    });
  });

  const finalFen = chess.fen();
  return {
    startFen,
    fen: finalFen,
    sideToMove: sideOf(chess),
    moves: records,
    board: boardOf(chess),
    legalMoves: chess.moves(),
    status: statusOf(chess),
    pgn: chess.pgn(),
    analysisUrl: analysisUrl(finalFen)
  };
}

export interface AnalyzeGameOptions {
  /** First half-move to analyse (1-based). */
  from?: number;
  /** Last half-move to analyse (1-based, inclusive). */
  to?: number;
  movetimeMs?: number;
  signal?: AbortSignal;
}

function classify(centipawnLoss: number, isBest: boolean, forced: boolean): MoveClassification {
  if (forced) return "forced";
  if (isBest) return "best";
  if (centipawnLoss >= 300) return "blunder";
  if (centipawnLoss >= 100) return "mistake";
  if (centipawnLoss >= 50) return "inaccuracy";
  return "good";
}

export async function analyzeGame(
  input: Pick<PositionInput, "pgn" | "moves">,
  { from, to, movetimeMs, signal }: AnalyzeGameOptions,
  search: Search
): Promise<GameAnalysis> {
  if (input.pgn === undefined && input.moves === undefined) {
    throw new ChessInputError("Give the game as a PGN or a list of moves.");
  }
  const { history } = resolvePosition(input);
  if (history.length === 0) throw new ChessInputError("The game has no moves to analyse.");

  const first = clamp(from ?? 1, 1, history.length);
  const last = clamp(to ?? history.length, first, history.length);
  const perPly = clamp(
    movetimeMs ?? LIMITS.movetimeMs.default,
    LIMITS.movetimeMs.min,
    LIMITS.movetimeMs.max
  );
  // Every analysed move needs the position before and after it evaluated.
  const positionsWanted = last - first + 2;
  const positionBudget = Math.max(2, Math.floor(LIMITS.gameBudgetMs / perPly));
  const positions = Math.min(positionsWanted, positionBudget);
  const analysedTo = first + positions - 2;

  const evaluations: Evaluation[] = [];
  const bestMoves: (string | null)[] = [];
  let depth = 0;
  for (let ply = first - 1; ply <= analysedTo; ply++) {
    const fen = ply === 0 ? history[0].before : history[ply - 1].after;
    const chess = new Chess(fen);
    const terminal = terminalEvaluation(chess);
    if (terminal) {
      evaluations.push(terminal);
      bestMoves.push(null);
      continue;
    }
    const result = await search({
      fen,
      movetimeMs: perPly,
      multiPv: 1,
      signal,
      timeoutMs: perPly + 5_000
    });
    const line = result.lines[0];
    evaluations.push(
      line ? toWhitePerspective(line.score, sideOf(chess)) : { type: "cp", value: 0 }
    );
    bestMoves.push(result.bestMove ? (pvToSan(fen, [result.bestMove])[0] ?? null) : null);
    depth = Math.max(depth, result.depth);
  }

  const moves: AnalysedMove[] = [];
  for (let ply = first; ply <= analysedTo; ply++) {
    const move = history[ply - 1];
    const before = evaluations[ply - first];
    const after = evaluations[ply - first + 1];
    const side: Side = move.color === "w" ? "white" : "black";
    const sign = side === "white" ? 1 : -1;
    const centipawnLoss = Math.max(0, sign * (toCentipawns(before) - toCentipawns(after)));
    const bestMove = bestMoves[ply - first] ?? move.san;
    const forced = new Chess(move.before).moves().length === 1;
    moves.push({
      ply,
      moveNumber: Math.floor((ply - 1) / 2) + 1,
      side,
      san: move.san,
      evaluationBefore: formatEvaluation(before),
      evaluationAfter: formatEvaluation(after),
      bestMove,
      centipawnLoss,
      classification: classify(centipawnLoss, bestMove === move.san, forced),
      fenBefore: move.before
    });
  }

  const accuracy: Record<Side, number | null> = { white: null, black: null };
  const counts: GameAnalysis["counts"] = {
    white: { inaccuracies: 0, mistakes: 0, blunders: 0 },
    black: { inaccuracies: 0, mistakes: 0, blunders: 0 }
  };
  for (const side of ["white", "black"] as const) {
    const own = moves.filter((move) => move.side === side);
    if (own.length === 0) continue;
    const scores = own.map((move) => {
      const before = evaluations[move.ply - first];
      const after = evaluations[move.ply - first + 1];
      const sign = side === "white" ? 1 : -1;
      const drop = sign * (winPercent(toCentipawns(before)) - winPercent(toCentipawns(after)));
      return clamp(103.1668 * Math.exp(-0.04354 * Math.max(0, drop)) - 3.1669, 0, 100);
    });
    accuracy[side] =
      Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10;
    counts[side].inaccuracies = own.filter((move) => move.classification === "inaccuracy").length;
    counts[side].mistakes = own.filter((move) => move.classification === "mistake").length;
    counts[side].blunders = own.filter((move) => move.classification === "blunder").length;
  }

  const criticalMoments = [...moves]
    .filter((move) => move.centipawnLoss >= 50)
    .sort((a, b) => b.centipawnLoss - a.centipawnLoss)
    .slice(0, 5);

  return {
    plies: history.length,
    analysedPlies: { from: first, to: analysedTo },
    truncated: analysedTo < last,
    depth,
    finalEvaluation: formatEvaluation(evaluations[evaluations.length - 1]),
    accuracy,
    counts,
    criticalMoments,
    moves,
    note: "Evaluations are from White's point of view. centipawnLoss is how much the move cost the player compared with the engine's best move."
  };
}
