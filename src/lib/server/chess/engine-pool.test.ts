import { beforeEach, describe, expect, it, vi } from "vitest";

const fs = vi.hoisted(() => ({ executables: new Set<string>() }));
vi.mock("node:fs", () => ({
  accessSync: (path: string) => {
    if (!fs.executables.has(path)) throw new Error("ENOENT");
  },
  constants: { X_OK: 1 }
}));

/** Fake UciEngine instances, in creation order; searches resolve on `finish()`. */
const engines: ReturnType<typeof fakeEngine>[] = [];
const failNextInit = vi.hoisted(() => ({ value: false }));

function fakeEngine() {
  const pending: Array<() => void> = [];
  return {
    alive: true,
    init: vi.fn(async () => {
      if (failNextInit.value) {
        failNextInit.value = false;
        throw new Error("spawn ENOENT");
      }
    }),
    quit: vi.fn(),
    search: vi.fn(
      () =>
        new Promise<{ bestMove: string }>((resolve) =>
          pending.push(() => resolve({ bestMove: "e2e4" }))
        )
    ),
    finish() {
      pending.shift()?.();
    }
  };
}

vi.mock("./uci-engine", () => ({
  UciEngine: class {
    constructor() {
      const engine = fakeEngine();
      engines.push(engine);
      return engine;
    }
  }
}));

const { env } = await import("$env/dynamic/private");
const { resolveEnginePath, isChessEngineAvailable, EnginePool } = await import("./engine-pool");

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const settle = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  engines.length = 0;
  fs.executables.clear();
  failNextInit.value = false;
  delete env.CHESS_ENGINE_PATH;
});

describe("resolveEnginePath", () => {
  it("uses CHESS_ENGINE_PATH when it points at an executable", () => {
    fs.executables.add("/opt/sf");
    fs.executables.add("/usr/games/stockfish");
    env.CHESS_ENGINE_PATH = "/opt/sf";
    expect(resolveEnginePath()).toBe("/opt/sf");
    expect(isChessEngineAvailable()).toBe(true);

    // An explicit path that is missing is an error to notice, not something to paper over.
    env.CHESS_ENGINE_PATH = "/opt/missing";
    expect(resolveEnginePath()).toBeNull();
    expect(isChessEngineAvailable()).toBe(false);
  });

  it("falls back to stockfish on the PATH or in a common location", () => {
    expect(isChessEngineAvailable()).toBe(false);
    fs.executables.add("/usr/games/stockfish");
    expect(resolveEnginePath()).toBe("/usr/games/stockfish");
  });
});

describe("EnginePool", () => {
  it("starts engines lazily up to the limit and queues further searches", async () => {
    const pool = new EnginePool({ path: "/sf", instances: 2 });
    const first = pool.search({ fen: START, depth: 1 });
    const second = pool.search({ fen: START, depth: 1 });
    const third = pool.search({ fen: START, depth: 1 });
    await settle();
    expect(engines).toHaveLength(2);
    expect(engines[0].search).toHaveBeenCalledTimes(1);
    expect(engines[1].search).toHaveBeenCalledTimes(1);

    engines[0].finish();
    expect(await first).toEqual({ bestMove: "e2e4" });
    await settle();
    // The queued search reuses the engine that just became free.
    expect(engines[0].search).toHaveBeenCalledTimes(2);
    engines[1].finish();
    engines[0].finish();
    await Promise.all([second, third]);
    expect(engines).toHaveLength(2);
  });

  it("replaces an engine that died, including for a waiting search", async () => {
    const pool = new EnginePool({ path: "/sf", instances: 1 });
    const first = pool.search({ fen: START, depth: 1 });
    await settle();
    const second = pool.search({ fen: START, depth: 1 });
    await settle();
    expect(engines).toHaveLength(1);

    engines[0].alive = false;
    engines[0].finish();
    await first;
    await settle();
    expect(engines).toHaveLength(2);
    expect(engines[1].search).toHaveBeenCalledTimes(1);
    engines[1].finish();
    expect(await second).toEqual({ bestMove: "e2e4" });

    engines[1].alive = false;
    const third = pool.search({ fen: START, depth: 1 });
    await settle();
    expect(engines).toHaveLength(3);
    engines[2].finish();
    await third;
  });

  it("surfaces start-up failures and tries again next time", async () => {
    const pool = new EnginePool({ path: "/sf", instances: 1 });
    failNextInit.value = true;
    await expect(pool.search({ fen: START, depth: 1 })).rejects.toThrow(/ENOENT/);
    expect(engines[0].quit).toHaveBeenCalled();

    const retry = pool.search({ fen: START, depth: 1 });
    await settle();
    expect(engines).toHaveLength(2);
    engines[1].finish();
    await retry;
  });

  it("gives up on a search that waits too long for an engine", async () => {
    vi.useFakeTimers();
    try {
      const pool = new EnginePool({ path: "/sf", instances: 1 });
      const running = pool.search({ fen: START, depth: 1 });
      await Promise.resolve();
      await Promise.resolve();
      const waiting = pool.search({ fen: START, depth: 1 });
      const failure = expect(waiting).rejects.toThrow(/busy/);
      await vi.advanceTimersByTimeAsync(10_000);
      await failure;
      engines[0].finish();
      await running;
      pool.quit();
      expect(engines[0].quit).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
