import { spawn } from "node:child_process";
import type { EventEmitter } from "node:events";
import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";

/** The parts of a child process the engine client uses; tests supply a fake. */
export interface EngineProcess extends EventEmitter {
  stdin: Writable;
  stdout: Readable;
  kill(): boolean | void;
}

export type SpawnEngine = (path: string) => EngineProcess;

/** A score as the engine reports it: from the side to move's point of view. */
export type EngineScore = { type: "cp"; value: number } | { type: "mate"; value: number };

export interface EngineLine {
  /** 1-based rank of the line (UCI `multipv`). */
  multipv: number;
  depth: number;
  score: EngineScore;
  /** Principal variation in UCI long algebraic notation, e.g. `e2e4`. */
  pv: string[];
}

export interface SearchOptions {
  fen: string;
  /** Stop at this depth. At least one of `depth` and `movetimeMs` is required. */
  depth?: number;
  /** Stop after this many milliseconds, whichever of depth and time comes first. */
  movetimeMs?: number;
  multiPv?: number;
  signal?: AbortSignal;
  /** Hard limit on the whole search, after which the engine is killed. */
  timeoutMs?: number;
}

export interface SearchResult {
  /** Null when the engine has no move (the position is already over). */
  bestMove: string | null;
  depth: number;
  lines: EngineLine[];
}

export interface EngineOptions {
  path: string;
  threads?: number;
  hashMb?: number;
  spawn?: SpawnEngine;
}

const INIT_TIMEOUT_MS = 10_000;
const STOP_TIMEOUT_MS = 2_000;

const defaultSpawn: SpawnEngine = (path) =>
  spawn(path, [], { stdio: ["pipe", "pipe", "ignore"] }) as EngineProcess;

/**
 * One UCI engine process. It runs one search at a time; callers serialise
 * access through the engine pool.
 */
export class UciEngine {
  private readonly process: EngineProcess;
  private readonly lineHandlers = new Set<(line: string) => void>();
  private readonly exitHandlers = new Set<(error: Error) => void>();
  private exitError: Error | null = null;
  private multiPv = 1;
  private searching = false;
  name = "unknown engine";

  constructor(private readonly options: EngineOptions) {
    this.process = (options.spawn ?? defaultSpawn)(options.path);
    createInterface({ input: this.process.stdout }).on("line", (line) => {
      for (const handler of this.lineHandlers) handler(line);
    });
    this.process.on("error", (error: Error) => this.handleExit(error));
    this.process.on("exit", (code: number | null) =>
      this.handleExit(new Error(`Chess engine exited with code ${code ?? "unknown"}`))
    );
  }

  /** True until the process has exited or failed to start. */
  get alive(): boolean {
    return this.exitError === null;
  }

  get busy(): boolean {
    return this.searching;
  }

  /** Completes the UCI handshake and applies the engine options. */
  async init(): Promise<void> {
    // Listeners go on before each command is sent: a fast engine may answer
    // synchronously, as the test double does.
    const uciok = this.waitFor(
      (line) => line === "uciok",
      INIT_TIMEOUT_MS,
      (line) => {
        if (line.startsWith("id name ")) this.name = line.slice("id name ".length).trim();
      }
    );
    this.send("uci");
    await uciok;
    if (this.options.threads) this.send(`setoption name Threads value ${this.options.threads}`);
    if (this.options.hashMb) this.send(`setoption name Hash value ${this.options.hashMb}`);
    this.send(`setoption name MultiPV value ${this.multiPv}`);
    const readyok = this.waitFor((line) => line === "readyok", INIT_TIMEOUT_MS);
    this.send("isready");
    await readyok;
  }

  async search({
    fen,
    depth,
    movetimeMs,
    multiPv = 1,
    signal,
    timeoutMs = 30_000
  }: SearchOptions): Promise<SearchResult> {
    if (this.searching) throw new Error("Chess engine is already searching");
    if (!depth && !movetimeMs) throw new Error("A search needs a depth or a time limit");
    if (/[\r\n\0]/.test(fen)) throw new Error("Invalid FEN");
    signal?.throwIfAborted();

    this.searching = true;
    const lines = new Map<number, EngineLine>();
    let stopped = false;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      this.send("stop");
    };
    signal?.addEventListener("abort", stop, { once: true });

    try {
      if (multiPv !== this.multiPv) {
        this.multiPv = multiPv;
        this.send(`setoption name MultiPV value ${multiPv}`);
      }
      const finished = this.waitFor(
        (line) => line.startsWith("bestmove"),
        timeoutMs,
        (line) => {
          const parsed = parseInfoLine(line);
          if (parsed) lines.set(parsed.multipv, parsed);
        },
        stop
      );
      this.send(`position fen ${fen}`);
      const limits = [depth && `depth ${depth}`, movetimeMs && `movetime ${movetimeMs}`]
        .filter(Boolean)
        .join(" ");
      this.send(`go ${limits}`);
      const bestmove = await finished;

      const move = bestmove.split(/\s+/)[1];
      const sorted = [...lines.values()].sort((a, b) => a.multipv - b.multipv);
      return {
        bestMove: !move || move === "(none)" ? null : move,
        depth: sorted[0]?.depth ?? 0,
        lines: sorted
      };
    } finally {
      signal?.removeEventListener("abort", stop);
      this.searching = false;
    }
  }

  quit(): void {
    if (!this.alive) return;
    this.send("quit");
    setTimeout(() => this.process.kill(), STOP_TIMEOUT_MS).unref?.();
  }

  private send(command: string): void {
    if (!this.alive) return;
    this.process.stdin.write(command + "\n");
  }

  private handleExit(error: Error): void {
    if (this.exitError) return;
    this.exitError = error;
    for (const handler of this.exitHandlers) handler(error);
  }

  /**
   * Resolves with the first line matching `match`, feeding every line to
   * `onLine` meanwhile. On timeout, `onTimeout` is given a chance to stop the
   * engine gracefully before the process is killed.
   */
  private waitFor(
    match: (line: string) => boolean,
    timeoutMs: number,
    onLine?: (line: string) => void,
    onTimeout?: () => void
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        this.lineHandlers.delete(handleLine);
        this.exitHandlers.delete(handleExit);
      };
      const handleLine = (line: string) => {
        onLine?.(line);
        if (match(line)) {
          cleanup();
          resolve(line);
        }
      };
      const handleExit = (error: Error) => {
        cleanup();
        reject(error);
      };
      const fail = () => {
        cleanup();
        this.process.kill();
        this.handleExit(new Error("Chess engine did not respond and was stopped"));
        reject(new Error("Chess engine timed out"));
      };
      let timer = setTimeout(() => {
        if (!onTimeout) return fail();
        // Give the engine a moment to answer `stop`, then give up on it.
        onTimeout();
        timer = setTimeout(fail, STOP_TIMEOUT_MS);
      }, timeoutMs);

      if (this.exitError) return handleExit(this.exitError);
      this.lineHandlers.add(handleLine);
      this.exitHandlers.add(handleExit);
    });
  }
}

/**
 * Parses a UCI `info` line that carries a principal variation. Lines without
 * a `pv`, and bound (`lowerbound`/`upperbound`) scores, are ignored.
 */
export function parseInfoLine(line: string): EngineLine | null {
  if (!line.startsWith("info ")) return null;
  const tokens = line.split(/\s+/);
  const pvIndex = tokens.indexOf("pv");
  if (pvIndex === -1) return null;
  if (tokens.includes("lowerbound") || tokens.includes("upperbound")) return null;

  let depth = 0;
  let multipv = 1;
  let score: EngineScore | null = null;
  for (let i = 1; i < pvIndex; i++) {
    switch (tokens[i]) {
      case "depth":
        depth = Number(tokens[++i]);
        break;
      case "multipv":
        multipv = Number(tokens[++i]);
        break;
      case "score": {
        const type = tokens[++i];
        const value = Number(tokens[++i]);
        if ((type === "cp" || type === "mate") && Number.isFinite(value)) score = { type, value };
        break;
      }
    }
  }
  if (!score || !depth) return null;
  return { multipv, depth, score, pv: tokens.slice(pvIndex + 1) };
}
