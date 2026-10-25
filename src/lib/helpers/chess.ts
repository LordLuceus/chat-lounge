import type {
  Evaluation,
  GameAnalysis,
  MoveRecord,
  MovesResult,
  PositionAnalysis,
  Side
} from "$lib/types/chess";
import type { UIDataTypes, UIMessagePart, UITools } from "ai";

export const CHESS_PART_TYPES = {
  "tool-analyzePosition": "position",
  "tool-makeMoves": "moves",
  "tool-analyzeGame": "game"
} as const;

export type ChessPartKind = (typeof CHESS_PART_TYPES)[keyof typeof CHESS_PART_TYPES];

/** A chess tool's successful output, tagged with which tool produced it. */
export type ChessPart =
  | { kind: "position"; output: PositionAnalysis }
  | { kind: "moves"; output: MovesResult }
  | { kind: "game"; output: GameAnalysis };

export function isChessPartType(type: string): type is keyof typeof CHESS_PART_TYPES {
  return type in CHESS_PART_TYPES;
}

/**
 * Returns a chess tool's output once it has succeeded, or null while it is
 * running, if it failed, or for any other part. Tool parts are typed
 * generically, so the shape is checked by hand.
 */
export function getChessPart(part: UIMessagePart<UIDataTypes, UITools>): ChessPart | null {
  if (!isChessPartType(part.type)) return null;
  const { state, output } = part as { state?: string; output?: { success?: boolean } };
  if (state !== "output-available" || !output?.success) return null;
  return { kind: CHESS_PART_TYPES[part.type], output } as ChessPart;
}

/** The kind of chess tool still waiting on the engine, or null. */
export function getPendingChessPart(
  part: UIMessagePart<UIDataTypes, UITools>
): ChessPartKind | null {
  if (!isChessPartType(part.type)) return null;
  const { state } = part as { state?: string };
  return state === "input-streaming" || state === "input-available"
    ? CHESS_PART_TYPES[part.type]
    : null;
}

export type PieceChar = "K" | "Q" | "R" | "B" | "N" | "P" | "k" | "q" | "r" | "b" | "n" | "p";

/** A board as eight ranks from rank 8 down, each eight files from a to h. */
export type Board = (PieceChar | null)[][];

export const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

/** Parses the piece placement of a FEN; null when it is not an 8x8 board. */
export function parseFenBoard(fen: string): Board | null {
  const ranks = fen.trim().split(/\s+/)[0]?.split("/");
  if (ranks?.length !== 8) return null;
  const board: Board = [];
  for (const rank of ranks) {
    const squares: (PieceChar | null)[] = [];
    for (const char of rank) {
      if (/[1-8]/.test(char)) {
        squares.push(...Array<null>(Number(char)).fill(null));
      } else if (/[kqrbnpKQRBNP]/.test(char)) {
        squares.push(char as PieceChar);
      } else {
        return null;
      }
    }
    if (squares.length !== 8) return null;
    board.push(squares);
  }
  return board;
}

export function sideToMove(fen: string): Side {
  return fen.trim().split(/\s+/)[1] === "b" ? "black" : "white";
}

const PIECE_NAMES: Record<Lowercase<PieceChar>, [string, string]> = {
  k: ["king", "kings"],
  q: ["queen", "queens"],
  r: ["rook", "rooks"],
  b: ["bishop", "bishops"],
  n: ["knight", "knights"],
  p: ["pawn", "pawns"]
};

function listSquares(squares: string[]): string {
  if (squares.length <= 1) return squares.join("");
  return `${squares.slice(0, -1).join(", ")} and ${squares[squares.length - 1]}`;
}

/**
 * A spoken description of a position for screen readers: who is to move and
 * where each side's pieces stand, e.g. "White: king e1, rooks a1 and h1".
 */
export function describePosition(fen: string): string {
  const board = parseFenBoard(fen);
  if (!board) return "Chess position";

  const pieces: Record<Side, Partial<Record<Lowercase<PieceChar>, string[]>>> = {
    white: {},
    black: {}
  };
  board.forEach((rank, rankIndex) => {
    rank.forEach((piece, fileIndex) => {
      if (!piece) return;
      const side: Side = piece === piece.toUpperCase() ? "white" : "black";
      const type = piece.toLowerCase() as Lowercase<PieceChar>;
      (pieces[side][type] ??= []).push(`${FILES[fileIndex]}${8 - rankIndex}`);
    });
  });

  const describeSide = (side: Side) => {
    const parts = (Object.keys(PIECE_NAMES) as Lowercase<PieceChar>[])
      .filter((type) => pieces[side][type]?.length)
      .map((type) => {
        const squares = pieces[side][type]!;
        return `${PIECE_NAMES[type][squares.length > 1 ? 1 : 0]} ${listSquares(squares)}`;
      });
    return `${side === "white" ? "White" : "Black"}: ${parts.length ? parts.join(", ") : "no pieces"}`;
  };

  const mover = sideToMove(fen) === "white" ? "White" : "Black";
  return `${mover} to move. ${describeSide("white")}. ${describeSide("black")}.`;
}

/** Splits a UCI move such as `e7e8q` into its squares; null for anything else. */
export function uciSquares(move: string | null | undefined): { from: string; to: string } | null {
  const match = /^([a-h][1-8])([a-h][1-8])[qrbn]?$/i.exec(move ?? "");
  return match ? { from: match[1].toLowerCase(), to: match[2].toLowerCase() } : null;
}

/** The board coordinates (0-based from the a8 corner) of a square like `e4`. */
export function squareCoordinates(square: string): { file: number; rank: number } | null {
  const match = /^([a-h])([1-8])$/.exec(square);
  if (!match) return null;
  return { file: FILES.indexOf(match[1] as (typeof FILES)[number]), rank: 8 - Number(match[2]) };
}

/** How likely White is to win, 0 to 100, on Lichess's curve; drives the eval bar. */
export function whiteWinPercent(evaluation: Evaluation): number {
  switch (evaluation.type) {
    case "cp":
      return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * evaluation.value)) - 1);
    case "mate":
      return evaluation.value > 0 ? 100 : 0;
    case "checkmate":
      return evaluation.winner === "white" ? 100 : 0;
    case "draw":
      return 50;
  }
}

/** Moves as they would appear in a PGN: `1. e4 e5 2. Nf3`. */
export function formatMoveList(moves: Pick<MoveRecord, "moveNumber" | "side" | "san">[]): string {
  return moves
    .map((move, index) =>
      move.side === "white" || index === 0
        ? `${move.moveNumber}.${move.side === "black" ? ".." : ""} ${move.san}`
        : move.san
    )
    .join(" ");
}

/** A one-line text stand-in for a chess tool's output, for copying and search. */
export function describeChessPart(chess: ChessPart): string {
  switch (chess.kind) {
    case "position": {
      const { display, bestMove } = chess.output;
      return `[Chess analysis: ${display}${bestMove ? `, best move ${bestMove}` : ""}]`;
    }
    case "moves":
      return `[Chess moves: ${formatMoveList(chess.output.moves)}]`;
    case "game": {
      const { accuracy, criticalMoments } = chess.output;
      const percent = (value: number | null) => (value === null ? "n/a" : `${value}%`);
      return `[Chess game review: White ${percent(accuracy.white)} accuracy, Black ${percent(accuracy.black)}, ${criticalMoments.length} critical moment${criticalMoments.length === 1 ? "" : "s"}]`;
    }
  }
}
