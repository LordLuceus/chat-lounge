import { describe, expect, it } from "vitest";
import {
  describeChessPart,
  describePosition,
  formatMoveList,
  getChessPart,
  getPendingChessPart,
  parseFenBoard,
  squareCoordinates,
  uciSquares,
  whiteWinPercent
} from "./chess";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

describe("parseFenBoard", () => {
  it("expands the piece placement into eight ranks", () => {
    const board = parseFenBoard(START)!;
    expect(board).toHaveLength(8);
    expect(board[0]).toEqual(["r", "n", "b", "q", "k", "b", "n", "r"]);
    expect(board[4]).toEqual(Array(8).fill(null));
    expect(board[7][4]).toBe("K");
    expect(parseFenBoard("8/8/8/8/8/4k3/4p3/4K3 w - - 0 1")![5]).toEqual([
      null,
      null,
      null,
      null,
      "k",
      null,
      null,
      null
    ]);
  });

  it("rejects malformed boards", () => {
    expect(parseFenBoard("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP w KQkq - 0 1")).toBeNull();
    expect(parseFenBoard("rnbqkbnr/pppppppp/9/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1")).toBeNull();
    expect(parseFenBoard("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNX w - - 0 1")).toBeNull();
    expect(parseFenBoard("")).toBeNull();
  });
});

describe("describePosition", () => {
  it("names each side's pieces and who is to move", () => {
    expect(describePosition("8/8/8/8/8/4k3/4p3/4K3 b - - 0 1")).toBe(
      "Black to move. White: king e1. Black: king e3, pawn e2."
    );
    expect(describePosition(START)).toBe(
      "White to move. White: king e1, queen d1, rooks a1 and h1, bishops c1 and f1, knights b1 and g1, pawns a2, b2, c2, d2, e2, f2, g2 and h2. Black: king e8, queen d8, rooks a8 and h8, bishops c8 and f8, knights b8 and g8, pawns a7, b7, c7, d7, e7, f7, g7 and h7."
    );
    expect(describePosition("garbage")).toBe("Chess position");
  });
});

describe("square helpers", () => {
  it("splits UCI moves and locates squares", () => {
    expect(uciSquares("e2e4")).toEqual({ from: "e2", to: "e4" });
    expect(uciSquares("a7a8q")).toEqual({ from: "a7", to: "a8" });
    expect(uciSquares("Nf3")).toBeNull();
    expect(uciSquares(null)).toBeNull();
    expect(squareCoordinates("a8")).toEqual({ file: 0, rank: 0 });
    expect(squareCoordinates("h1")).toEqual({ file: 7, rank: 7 });
    expect(squareCoordinates("i9")).toBeNull();
  });

  it("maps evaluations onto a win percentage for White", () => {
    expect(whiteWinPercent({ type: "cp", value: 0 })).toBe(50);
    expect(whiteWinPercent({ type: "cp", value: 300 })).toBeGreaterThan(75);
    expect(whiteWinPercent({ type: "cp", value: -300 })).toBeLessThan(25);
    expect(whiteWinPercent({ type: "mate", value: -2 })).toBe(0);
    expect(whiteWinPercent({ type: "checkmate", winner: "white" })).toBe(100);
    expect(whiteWinPercent({ type: "draw" })).toBe(50);
  });
});

describe("tool parts", () => {
  const part = (type: string, overrides: Record<string, unknown>) =>
    ({ type, toolCallId: "c1", ...overrides }) as never;
  const position = {
    fen: START,
    display: "+0.30",
    bestMove: "e4",
    sideToMove: "white",
    evaluation: { type: "cp", value: 30 },
    lines: [],
    status: {},
    legalMoves: [],
    board: [],
    analysisUrl: "",
    depth: 18,
    bestMoveUci: "e2e4",
    note: ""
  };

  it("returns successful outputs tagged by tool, and pending state otherwise", () => {
    const done = part("tool-analyzePosition", {
      state: "output-available",
      output: { success: true, ...position }
    });
    expect(getChessPart(done)).toEqual({
      kind: "position",
      output: { success: true, ...position }
    });
    expect(getPendingChessPart(done)).toBeNull();

    const running = part("tool-analyzeGame", { state: "input-available", input: {} });
    expect(getChessPart(running)).toBeNull();
    expect(getPendingChessPart(running)).toBe("game");

    const failed = part("tool-makeMoves", {
      state: "output-available",
      output: { success: false, message: "illegal" }
    });
    expect(getChessPart(failed)).toBeNull();
    expect(getPendingChessPart(failed)).toBeNull();

    expect(
      getChessPart(part("tool-webSearch", { state: "output-available", output: {} }))
    ).toBeNull();
    expect(getChessPart({ type: "text", text: "hi" })).toBeNull();
  });

  it("describes outputs in one line for copying and search", () => {
    expect(describeChessPart({ kind: "position", output: position as never })).toBe(
      "[Chess analysis: +0.30, best move e4]"
    );
    expect(
      describeChessPart({
        kind: "position",
        output: { ...position, display: "checkmate, White wins", bestMove: null } as never
      })
    ).toBe("[Chess analysis: checkmate, White wins]");
    expect(
      describeChessPart({
        kind: "moves",
        output: {
          moves: [
            { moveNumber: 1, side: "white", san: "e4" },
            { moveNumber: 1, side: "black", san: "e5" },
            { moveNumber: 2, side: "white", san: "Nf3" }
          ]
        } as never
      })
    ).toBe("[Chess moves: 1. e4 e5 2. Nf3]");
    expect(
      describeChessPart({
        kind: "game",
        output: { accuracy: { white: 81.5, black: null }, criticalMoments: [{}] } as never
      })
    ).toBe("[Chess game review: White 81.5% accuracy, Black n/a, 1 critical moment]");
  });

  it("numbers a move list that starts with Black", () => {
    expect(
      formatMoveList([
        { moveNumber: 3, side: "black", san: "Nc6" },
        { moveNumber: 4, side: "white", san: "Bb5" }
      ])
    ).toBe("3... Nc6 4. Bb5");
  });
});
