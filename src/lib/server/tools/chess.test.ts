import { beforeEach, describe, expect, it, vi } from "vitest";

const pool = vi.hoisted(() => ({ search: vi.fn() }));
const getEnginePool = vi.hoisted(() => vi.fn());
vi.mock("$lib/server/chess/engine-pool", () => ({ getEnginePool }));

const { createChessTools } = await import("./chess");

const callOptions = { toolCallId: "call", messages: [] };
const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

beforeEach(() => {
  pool.search.mockReset();
  getEnginePool.mockReturnValue(pool);
});

describe("chess tools", () => {
  const tools = createChessTools();

  it("analyzePosition runs the engine and returns the analysis", async () => {
    pool.search.mockResolvedValueOnce({
      bestMove: "e2e4",
      depth: 18,
      lines: [{ multipv: 1, depth: 18, score: { type: "cp", value: 30 }, pv: ["e2e4", "e7e5"] }]
    });
    const result = await tools.analyzePosition.execute!(
      { fen: START, multiPv: 1 },
      { ...callOptions, abortSignal: new AbortController().signal }
    );
    expect(result).toMatchObject({
      success: true,
      display: "+0.30",
      bestMove: "e4",
      lines: [{ moves: ["e4", "e5"] }]
    });
    expect(pool.search).toHaveBeenCalledWith(
      expect.objectContaining({ fen: START, multiPv: 1, signal: expect.any(AbortSignal) })
    );
  });

  it("reports bad input and engine failures without throwing", async () => {
    expect(await tools.analyzePosition.execute!({ fen: "nope" }, callOptions)).toMatchObject({
      success: false,
      message: expect.stringContaining("Invalid FEN")
    });

    pool.search.mockRejectedValueOnce(new Error("busy"));
    expect(await tools.analyzePosition.execute!({ fen: START }, callOptions)).toEqual({
      success: false,
      message: "Chess engine error: busy"
    });

    getEnginePool.mockReturnValue(null);
    expect(await tools.analyzePosition.execute!({ fen: START }, callOptions)).toMatchObject({
      success: false,
      message: expect.stringContaining("No chess engine is configured")
    });
  });

  it("analyzeGame reviews the moves", async () => {
    pool.search.mockResolvedValue({
      bestMove: "a2a3",
      depth: 10,
      lines: [{ multipv: 1, depth: 10, score: { type: "cp", value: 0 }, pv: ["a2a3"] }]
    });
    const result = (await tools.analyzeGame.execute!(
      { moves: ["e4", "e5"], movetimeMs: 100 },
      callOptions
    )) as { success: boolean; moves: unknown[] };
    expect(result.success).toBe(true);
    expect(result.moves).toHaveLength(2);
    expect(pool.search).toHaveBeenCalledTimes(3);
  });

  it("makeMoves needs no engine", async () => {
    getEnginePool.mockReturnValue(null);
    const result = await tools.makeMoves.execute!({ moves: ["e4", "c5"] }, callOptions);
    expect(result).toMatchObject({ success: true, sideToMove: "white" });
    expect(await tools.makeMoves.execute!({ moves: ["e5"] }, callOptions)).toMatchObject({
      success: false,
      message: expect.stringContaining("illegal")
    });
  });
});
