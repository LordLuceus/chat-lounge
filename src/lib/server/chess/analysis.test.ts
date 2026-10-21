import { Chess } from "chess.js";
import { describe, expect, it, vi } from "vitest";
import {
  analyzeGame,
  analyzePosition,
  ChessInputError,
  formatEvaluation,
  LIMITS,
  makeMoves,
  pvToSan,
  resolvePosition,
  toWhitePerspective,
  type Search
} from "./analysis";
import type { EngineScore } from "./uci-engine";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const AFTER_E4_E5 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";
/** White mates with Rd8. */
const MATE_IN_ONE = "6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1";
const SCHOLARS_MATE = "r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4";

/** A search that answers with a fixed score and line regardless of position. */
function fixedSearch(score: EngineScore, pv: string[], depth = 12): Search {
  return vi.fn(async () => ({
    bestMove: pv[0] ?? null,
    depth,
    lines: [{ multipv: 1, depth, score, pv }]
  }));
}

describe("resolvePosition", () => {
  it("accepts a FEN, a PGN or a move list", () => {
    expect(resolvePosition({ fen: AFTER_E4_E5 }).chess.fen()).toBe(AFTER_E4_E5);
    expect(resolvePosition({ pgn: "1. e4 e5 *" }).chess.fen()).toBe(AFTER_E4_E5);
    expect(resolvePosition({ moves: ["e2e4", "e5"] }).chess.fen()).toBe(AFTER_E4_E5);
  });

  it("rewinds to a ply when asked", () => {
    const { chess, history } = resolvePosition({ pgn: "1. e4 e5 2. Nf3 Nc6 *", ply: 2 });
    expect(chess.fen()).toBe(AFTER_E4_E5);
    expect(history.map((move) => move.san)).toEqual(["e4", "e5"]);
    expect(resolvePosition({ moves: ["e4", "e5"], ply: 0 }).chess.fen()).toBe(START);
    expect(() => resolvePosition({ moves: ["e4"], ply: 2 })).toThrow(/between 0 and 1/);
  });

  it("explains bad input", () => {
    expect(() => resolvePosition({})).toThrow(ChessInputError);
    expect(() => resolvePosition({ fen: "not a fen" })).toThrow(/six space-delimited fields/);
    expect(() => resolvePosition({ fen: START, pgn: "1. e4 *" })).toThrow(/not several/);
    expect(() => resolvePosition({ pgn: "1. e4 e5 2. Qh9 *" })).toThrow(/Could not parse the PGN/);
    expect(() => resolvePosition({ moves: ["e4", "e4"] })).toThrow(
      /Move 2 \(e4\) is illegal in position .* Legal moves: /
    );
    expect(() => resolvePosition({ pgn: "x".repeat(LIMITS.maxPgnBytes + 1) })).toThrow(/too long/);
  });
});

describe("evaluation helpers", () => {
  it("flips the engine's score to White's point of view", () => {
    expect(toWhitePerspective({ type: "cp", value: 35 }, "white")).toEqual({
      type: "cp",
      value: 35
    });
    expect(toWhitePerspective({ type: "cp", value: 35 }, "black")).toEqual({
      type: "cp",
      value: -35
    });
    expect(toWhitePerspective({ type: "mate", value: 2 }, "black")).toEqual({
      type: "mate",
      value: -2
    });
  });

  it("formats evaluations for people", () => {
    expect(formatEvaluation({ type: "cp", value: 35 })).toBe("+0.35");
    expect(formatEvaluation({ type: "cp", value: -120 })).toBe("-1.20");
    expect(formatEvaluation({ type: "cp", value: 0 })).toBe("0.00");
    expect(formatEvaluation({ type: "mate", value: 3 })).toBe("#3");
    expect(formatEvaluation({ type: "mate", value: -2 })).toBe("#-2");
    expect(formatEvaluation({ type: "checkmate", winner: "black" })).toBe("checkmate, Black wins");
    expect(formatEvaluation({ type: "draw" })).toBe("draw");
  });

  it("converts a UCI line to SAN and stops at the first illegal move", () => {
    expect(pvToSan(START, ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5"])).toEqual([
      "e4",
      "e5",
      "Nf3",
      "Nc6",
      "Bb5"
    ]);
    expect(pvToSan(START, ["e2e4", "e2e4"])).toEqual(["e4"]);
    expect(pvToSan("8/P7/8/8/8/8/8/k6K w - - 0 1", ["a7a8q"])).toEqual(["a8=Q+"]);
  });
});

describe("analyzePosition", () => {
  it("returns the evaluation, lines in SAN and the position details", async () => {
    const search = fixedSearch({ type: "cp", value: -30 }, ["g8f6", "b1c3"], 16);
    const result = await analyzePosition(
      { moves: ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4"] },
      { depth: 16, multiPv: 2 },
      search
    );
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        depth: 16,
        multiPv: 2,
        movetimeMs: LIMITS.searchTimeMs,
        fen: expect.stringContaining(" b ")
      })
    );
    // Black to move and the engine likes Black by 0.30, so White's view is -0.30.
    expect(result).toMatchObject({
      sideToMove: "black",
      evaluation: { type: "cp", value: 30 },
      display: "+0.30",
      depth: 16,
      bestMove: "Nf6",
      lines: [{ rank: 1, display: "+0.30", moves: ["Nf6", "Nc3"] }],
      status: { check: false, checkmate: false, gameOver: false }
    });
    expect(result.legalMoves).toContain("Nf6");
    expect(result.board).toHaveLength(11);
    expect(result.board[1]).toContain("8 | r");
    expect(result.analysisUrl).toBe(
      `https://lichess.org/analysis/${result.fen.replace(/ /g, "_")}`
    );
  });

  it("clamps depth and the number of lines", async () => {
    const search = fixedSearch({ type: "cp", value: 0 }, ["e2e4"]);
    await analyzePosition({ fen: START }, { depth: 99, multiPv: 50 }, search);
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({ depth: LIMITS.depth.max, multiPv: LIMITS.multiPv.max })
    );
    await analyzePosition({ fen: START }, {}, search);
    expect(search).toHaveBeenLastCalledWith(
      expect.objectContaining({ depth: LIMITS.depth.default, multiPv: LIMITS.multiPv.default })
    );
  });

  it("reports mates from White's point of view", async () => {
    const result = await analyzePosition(
      { fen: MATE_IN_ONE },
      {},
      fixedSearch({ type: "mate", value: 1 }, ["d1d8"])
    );
    expect(result).toMatchObject({ display: "#1", bestMove: "Rd8#", lines: [{ moves: ["Rd8#"] }] });
  });

  it("does not ask the engine about finished games", async () => {
    const search = fixedSearch({ type: "cp", value: 0 }, []);
    const result = await analyzePosition({ fen: SCHOLARS_MATE }, {}, search);
    expect(search).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      evaluation: { type: "checkmate", winner: "white" },
      display: "checkmate, White wins",
      bestMove: null,
      lines: [],
      legalMoves: [],
      status: { check: true, checkmate: true, gameOver: true }
    });
  });

  it("passes the abort signal through", async () => {
    const search = fixedSearch({ type: "cp", value: 0 }, ["e2e4"]);
    const controller = new AbortController();
    await analyzePosition({ fen: START }, { signal: controller.signal }, search);
    expect(search).toHaveBeenCalledWith(expect.objectContaining({ signal: controller.signal }));
  });
});

describe("makeMoves", () => {
  it("plays moves from the start, a FEN or a PGN", () => {
    const result = makeMoves({ moves: ["e4", "e5", "Qh5", "Nc6", "Bc4", "Nf6", "Qxf7#"] });
    expect(result.startFen).toBe(START);
    expect(result.fen).toBe(SCHOLARS_MATE);
    expect(result.moves[6]).toEqual({
      ply: 7,
      moveNumber: 4,
      side: "white",
      san: "Qxf7#",
      uci: "h5f7",
      fen: SCHOLARS_MATE
    });
    expect(result.status).toMatchObject({ checkmate: true, gameOver: true });
    expect(result.pgn).toContain("4. Qxf7#");

    expect(makeMoves({ fen: AFTER_E4_E5, moves: ["Nf3"] }).sideToMove).toBe("black");
    expect(
      makeMoves({ pgn: "1. e4 e5 *", moves: ["g1f3", "Nc6"] }).moves.map((m) => m.san)
    ).toEqual(["Nf3", "Nc6"]);
  });

  it("rejects illegal moves with the legal alternatives", () => {
    expect(() => makeMoves({ moves: ["e4", "Ke7"] })).toThrow(
      /Move 2 \(Ke7\) is illegal for black .* Legal moves: .*e5/
    );
  });
});

describe("analyzeGame", () => {
  const GAME = "1. e4 e5 2. Nf3 Nc6 3. Nxe5 Nxe5 *";

  /** A search that looks the position up in a table of White-perspective evaluations. */
  function tableSearch(evaluations: number[]): Search {
    const chess = new Chess();
    chess.loadPgn(GAME);
    const history = chess.history({ verbose: true });
    const byFen = new Map(
      evaluations.map((cp, ply) => [ply === 0 ? history[0].before : history[ply - 1].after, cp])
    );
    return vi.fn(async ({ fen }) => {
      const cp = byFen.get(fen);
      if (cp === undefined) throw new Error(`unexpected position ${fen}`);
      const whiteToMove = fen.split(" ")[1] === "w";
      const move = whiteToMove ? "a2a3" : "a7a6";
      return {
        bestMove: move,
        depth: 10,
        lines: [
          {
            multipv: 1,
            depth: 10,
            score: { type: "cp" as const, value: whiteToMove ? cp : -cp },
            pv: [move]
          }
        ]
      };
    });
  }

  it("evaluates every move and classifies the losses", async () => {
    const search = tableSearch([20, 30, 90, 95, 35, -280, -300]);
    const result = await analyzeGame({ pgn: GAME }, { movetimeMs: 100 }, search);
    expect(result.plies).toBe(6);
    expect(result.analysedPlies).toEqual({ from: 1, to: 6 });
    expect(result.truncated).toBe(false);
    expect(result.depth).toBe(10);
    expect(result.moves.map((move) => move.evaluationAfter)).toEqual([
      "+0.30",
      "+0.90",
      "+0.95",
      "+0.35",
      "-2.80",
      "-3.00"
    ]);
    expect(result.moves.map((move) => move.centipawnLoss)).toEqual([0, 60, 0, 0, 315, 0]);
    expect(result.moves.map((move) => move.classification)).toEqual([
      "good",
      "inaccuracy",
      "good",
      "good",
      "blunder",
      "good"
    ]);
    expect(result.moves[4]).toMatchObject({
      ply: 5,
      moveNumber: 3,
      side: "white",
      san: "Nxe5",
      evaluationBefore: "+0.35",
      bestMove: "a3",
      fenBefore: expect.stringContaining(" w ")
    });
    expect(result.counts).toEqual({
      white: { inaccuracies: 0, mistakes: 0, blunders: 1 },
      black: { inaccuracies: 1, mistakes: 0, blunders: 0 }
    });
    expect(result.criticalMoments.map((move) => move.san)).toEqual(["Nxe5", "e5"]);
    expect(result.accuracy.white).toBeLessThan(result.accuracy.black!);
    expect(result.finalEvaluation).toBe("-3.00");
    expect(search).toHaveBeenCalledTimes(7);
    expect(search).toHaveBeenCalledWith(expect.objectContaining({ movetimeMs: 100, multiPv: 1 }));
  });

  it("analyses only the requested range", async () => {
    const search = tableSearch([20, 30, 90, 95, 35, -280, -300]);
    const result = await analyzeGame({ pgn: GAME }, { from: 3, to: 4 }, search);
    expect(result.analysedPlies).toEqual({ from: 3, to: 4 });
    expect(result.moves.map((move) => move.san)).toEqual(["Nf3", "Nc6"]);
    expect(search).toHaveBeenCalledTimes(3);
    expect(result.finalEvaluation).toBe("+0.35");
  });

  it("marks engine moves as best and only moves as forced", async () => {
    const search: Search = vi.fn(async ({ fen }) => {
      const whiteToMove = fen.split(" ")[1] === "w";
      const move = whiteToMove ? "e2e4" : "e7e5";
      return {
        bestMove: move,
        depth: 10,
        lines: [{ multipv: 1, depth: 10, score: { type: "cp" as const, value: 0 }, pv: [move] }]
      };
    });
    const result = await analyzeGame({ moves: ["e4", "e5"] }, {}, search);
    expect(result.moves.map((move) => move.classification)).toEqual(["best", "best"]);

    // After 1. e4 e5 2. Qh5 Nc6 3. Bc4 g6 4. Qf3 ... Black's only legal reply to a check is forced.
    const forced = await analyzeGame(
      { moves: ["e4", "f5", "Qh5+", "g6"] },
      { from: 4 },
      fixedSearch({ type: "cp", value: 0 }, ["h5g6"])
    );
    expect(forced.moves).toHaveLength(1);
    expect(forced.moves[0]).toMatchObject({ san: "g6", classification: "forced" });
  });

  it("stops at the time budget and says so", async () => {
    const search = fixedSearch({ type: "cp", value: 0 }, ["a2a3"]);
    const moves = Array.from(
      { length: 40 },
      (_, i) => (i % 4 < 2 ? ["Nf3", "Nf6"] : ["Ng1", "Ng8"])[i % 2]
    );
    const result = await analyzeGame({ moves }, { movetimeMs: LIMITS.movetimeMs.max }, search);
    const budgetPositions = Math.floor(LIMITS.gameBudgetMs / LIMITS.movetimeMs.max);
    expect(result.truncated).toBe(true);
    expect(result.analysedPlies).toEqual({ from: 1, to: budgetPositions - 1 });
    expect(search).toHaveBeenCalledTimes(budgetPositions);
  });

  it("skips the engine for finished positions and validates input", async () => {
    const search = fixedSearch({ type: "cp", value: 0 }, ["a2a3"]);
    const result = await analyzeGame(
      { moves: ["e4", "e5", "Qh5", "Nc6", "Bc4", "Nf6", "Qxf7#"] },
      { from: 7 },
      search
    );
    expect(search).toHaveBeenCalledTimes(1);
    expect(result.moves[0]).toMatchObject({
      san: "Qxf7#",
      evaluationAfter: "checkmate, White wins"
    });
    expect(result.finalEvaluation).toBe("checkmate, White wins");

    await expect(analyzeGame({}, {}, search)).rejects.toThrow(/PGN or a list of moves/);
    await expect(analyzeGame({ pgn: "*" }, {}, search)).rejects.toThrow(/no moves/);
  });
});
