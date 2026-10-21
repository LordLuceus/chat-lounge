import { EventEmitter } from "node:events";
import { PassThrough, Writable } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import { parseInfoLine, UciEngine, type EngineProcess } from "./uci-engine";

/**
 * A scripted engine process: `respond` is called with every command written
 * to stdin and can print lines to stdout.
 */
class FakeProcess extends EventEmitter implements EngineProcess {
  stdout = new PassThrough();
  stdin: Writable;
  commands: string[] = [];
  killed = false;

  constructor(private respond: (command: string, print: (line: string) => void) => void) {
    super();
    this.stdin = new Writable({
      write: (chunk, _encoding, callback) => {
        for (const command of chunk.toString().split("\n").filter(Boolean)) {
          this.commands.push(command);
          this.respond(command, (line) => this.stdout.write(line + "\n"));
        }
        callback();
      }
    });
  }

  kill() {
    this.killed = true;
    this.emit("exit", 137);
    return true;
  }
}

/** Answers the handshake like Stockfish does; searches are left to the test. */
function handshake(command: string, print: (line: string) => void) {
  if (command === "uci") {
    print("id name Stockfish 17");
    print("id author the Stockfish developers");
    print("uciok");
  } else if (command === "isready") {
    print("readyok");
  }
}

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

async function engineWith(respond: FakeProcess["respond"]) {
  const process = new FakeProcess(respond);
  const engine = new UciEngine({
    path: "/fake/stockfish",
    threads: 2,
    hashMb: 32,
    spawn: () => process
  });
  await engine.init();
  return { engine, process };
}

describe("parseInfoLine", () => {
  it("reads depth, multipv, score and pv", () => {
    expect(
      parseInfoLine(
        "info depth 18 seldepth 25 multipv 2 score cp -35 nodes 1000 nps 10 hashfull 1 tbhits 0 time 100 pv e7e5 g1f3 b8c6"
      )
    ).toEqual({
      depth: 18,
      multipv: 2,
      score: { type: "cp", value: -35 },
      pv: ["e7e5", "g1f3", "b8c6"]
    });
    expect(parseInfoLine("info depth 5 score mate 3 pv d1h5")).toMatchObject({
      multipv: 1,
      score: { type: "mate", value: 3 }
    });
  });

  it("ignores lines without a line or with bound scores", () => {
    expect(parseInfoLine("info depth 10 currmove e2e4 currmovenumber 1")).toBeNull();
    expect(parseInfoLine("info depth 10 score cp 20 lowerbound pv e2e4")).toBeNull();
    expect(parseInfoLine("info string NNUE evaluation using nn.nnue")).toBeNull();
    expect(parseInfoLine("bestmove e2e4")).toBeNull();
  });
});

describe("UciEngine", () => {
  it("completes the handshake and applies the options", async () => {
    const { engine, process } = await engineWith(handshake);
    expect(engine.name).toBe("Stockfish 17");
    expect(process.commands).toEqual([
      "uci",
      "setoption name Threads value 2",
      "setoption name Hash value 32",
      "setoption name MultiPV value 1",
      "isready"
    ]);
  });

  it("runs a search and keeps the latest line per multipv", async () => {
    const { engine, process } = await engineWith((command, print) => {
      handshake(command, print);
      if (command.startsWith("go")) {
        print("info depth 1 multipv 1 score cp 10 pv e2e4");
        print("info depth 1 multipv 2 score cp 5 pv d2d4");
        print("info depth 2 multipv 2 score cp 8 pv d2d4 d7d5");
        print("info depth 2 multipv 1 score cp 12 pv e2e4 e7e5");
        print("bestmove e2e4 ponder e7e5");
      }
    });

    const result = await engine.search({ fen: START, depth: 2, multiPv: 2, movetimeMs: 500 });
    expect(result).toEqual({
      bestMove: "e2e4",
      depth: 2,
      lines: [
        { multipv: 1, depth: 2, score: { type: "cp", value: 12 }, pv: ["e2e4", "e7e5"] },
        { multipv: 2, depth: 2, score: { type: "cp", value: 8 }, pv: ["d2d4", "d7d5"] }
      ]
    });
    expect(process.commands.slice(-3)).toEqual([
      "setoption name MultiPV value 2",
      `position fen ${START}`,
      "go depth 2 movetime 500"
    ]);
    expect(engine.busy).toBe(false);
  });

  it("reports no best move for finished positions", async () => {
    const { engine } = await engineWith((command, print) => {
      handshake(command, print);
      if (command.startsWith("go")) print("bestmove (none)");
    });
    expect(await engine.search({ fen: START, depth: 1 })).toEqual({
      bestMove: null,
      depth: 0,
      lines: []
    });
  });

  it("stops the search when aborted and returns what it has", async () => {
    const { engine, process } = await engineWith((command, print) => {
      handshake(command, print);
      if (command.startsWith("go")) print("info depth 3 multipv 1 score cp 20 pv e2e4");
      if (command === "stop") print("bestmove e2e4");
    });
    const controller = new AbortController();
    const search = engine.search({ fen: START, depth: 30, signal: controller.signal });
    await new Promise((resolve) => setTimeout(resolve, 10));
    controller.abort();
    expect(await search).toMatchObject({ bestMove: "e2e4", depth: 3 });
    expect(process.commands).toContain("stop");
  });

  it("rejects overlapping searches, missing limits and unsafe input", async () => {
    const { engine } = await engineWith((command, print) => {
      handshake(command, print);
      if (command === "stop") print("bestmove e2e4");
    });
    await expect(engine.search({ fen: START })).rejects.toThrow(/depth or a time limit/);
    await expect(engine.search({ fen: `${START}\nquit`, depth: 1 })).rejects.toThrow(/Invalid FEN/);
    const controller = new AbortController();
    const first = engine.search({ fen: START, depth: 30, signal: controller.signal });
    await expect(engine.search({ fen: START, depth: 1 })).rejects.toThrow(/already searching/);
    controller.abort();
    await first;
  });

  it("kills an engine that stops answering and fails pending searches", async () => {
    vi.useFakeTimers();
    try {
      const { engine, process } = await engineWith(handshake);
      const search = engine.search({ fen: START, depth: 30, timeoutMs: 1000 });
      const failure = expect(search).rejects.toThrow(/timed out/);
      await vi.advanceTimersByTimeAsync(1000); // sends "stop"
      expect(process.commands.at(-1)).toBe("stop");
      await vi.advanceTimersByTimeAsync(2000); // no bestmove came back
      await failure;
      expect(process.killed).toBe(true);
      expect(engine.alive).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("fails fast when the process exits or cannot start", async () => {
    const { engine, process } = await engineWith(handshake);
    const search = engine.search({ fen: START, depth: 10 });
    process.emit("exit", 1);
    await expect(search).rejects.toThrow(/exited with code 1/);
    expect(engine.alive).toBe(false);
    await expect(engine.search({ fen: START, depth: 1 })).rejects.toThrow(/exited/);

    const broken = new FakeProcess(() => {});
    const missing = new UciEngine({ path: "/missing", spawn: () => broken });
    const init = missing.init();
    broken.emit("error", new Error("spawn ENOENT"));
    await expect(init).rejects.toThrow(/ENOENT/);
  });
});
