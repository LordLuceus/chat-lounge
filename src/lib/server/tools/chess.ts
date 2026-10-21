import {
  analyzeGame,
  analyzePosition,
  ChessInputError,
  LIMITS,
  makeMoves,
  type Search
} from "$lib/server/chess/analysis";
import { getEnginePool } from "$lib/server/chess/engine-pool";
import { tool } from "ai";
import { z } from "zod";

const positionFields = {
  fen: z.string().max(100).optional().describe("The position as a FEN string."),
  pgn: z
    .string()
    .max(LIMITS.maxPgnBytes)
    .optional()
    .describe("A game in PGN; the final position is used unless `ply` is given."),
  moves: z
    .array(z.string().max(10))
    .max(LIMITS.maxMoves)
    .optional()
    .describe("Moves from the starting position in SAN (e4, Nf3) or UCI (e2e4) notation."),
  ply: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("With `pgn` or `moves`: analyse the position after this many half-moves.")
};

function failure(error: unknown): { success: false; message: string } {
  if (error instanceof ChessInputError) return { success: false, message: error.message };
  return {
    success: false,
    message: `Chess engine error: ${error instanceof Error ? error.message : "Unknown error"}`
  };
}

const search: Search = (options) => {
  const pool = getEnginePool();
  if (!pool) throw new Error("No chess engine is configured");
  return pool.search(options);
};

export function createChessTools() {
  return {
    analyzePosition: tool({
      description:
        "Evaluate a chess position with the Stockfish engine: the best moves, the top lines in algebraic notation, and the evaluation from White's point of view. Give the position as a FEN, a PGN or a list of moves.",
      inputSchema: z.object({
        ...positionFields,
        depth: z
          .number()
          .int()
          .min(LIMITS.depth.min)
          .max(LIMITS.depth.max)
          .optional()
          .describe(
            `Search depth, ${LIMITS.depth.min} to ${LIMITS.depth.max}. Defaults to ${LIMITS.depth.default}.`
          ),
        multiPv: z
          .number()
          .int()
          .min(LIMITS.multiPv.min)
          .max(LIMITS.multiPv.max)
          .optional()
          .describe(
            `Number of candidate lines to return, up to ${LIMITS.multiPv.max}. Defaults to ${LIMITS.multiPv.default}.`
          )
      }),
      execute: async ({ depth, multiPv, ...position }, { abortSignal }) => {
        try {
          const analysis = await analyzePosition(
            position,
            { depth, multiPv, signal: abortSignal },
            search
          );
          return { success: true as const, ...analysis };
        } catch (error) {
          return failure(error);
        }
      }
    }),

    analyzeGame: tool({
      description:
        "Review a whole chess game with the Stockfish engine: every move's evaluation, centipawn loss and classification (blunder, mistake, inaccuracy), plus accuracy per side and the critical moments. Give the game as a PGN or a list of moves.",
      inputSchema: z.object({
        pgn: positionFields.pgn,
        moves: positionFields.moves,
        from: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("First half-move to analyse (1 = White's first move). Defaults to the start."),
        to: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("Last half-move to analyse. Defaults to the end of the game."),
        movetimeMs: z
          .number()
          .int()
          .min(LIMITS.movetimeMs.min)
          .max(LIMITS.movetimeMs.max)
          .optional()
          .describe(
            `Engine time per move in milliseconds, ${LIMITS.movetimeMs.min} to ${LIMITS.movetimeMs.max}. More time means deeper but slower analysis and fewer moves within the time budget. Defaults to ${LIMITS.movetimeMs.default}.`
          )
      }),
      execute: async ({ pgn, moves, from, to, movetimeMs }, { abortSignal }) => {
        try {
          const analysis = await analyzeGame(
            { pgn, moves },
            { from, to, movetimeMs, signal: abortSignal },
            search
          );
          return { success: true as const, ...analysis };
        } catch (error) {
          return failure(error);
        }
      }
    }),

    makeMoves: tool({
      description:
        "Play chess moves from a position and get the resulting position, the legal moves, a board diagram and whether the game is over. Use it to check that a line is legal before discussing it, or to set up a position for analyzePosition. Starts from the initial position unless a FEN or PGN is given.",
      inputSchema: z.object({
        fen: positionFields.fen,
        pgn: z
          .string()
          .max(LIMITS.maxPgnBytes)
          .optional()
          .describe("A game in PGN to start from, after its last move."),
        moves: z
          .array(z.string().max(10))
          .min(1)
          .max(LIMITS.maxMoves)
          .describe("Moves to play, in SAN (Nf3, O-O, e8=Q) or UCI (g1f3) notation.")
      }),
      execute: async (input) => {
        try {
          return { success: true as const, ...makeMoves(input) };
        } catch (error) {
          return failure(error);
        }
      }
    })
  };
}
