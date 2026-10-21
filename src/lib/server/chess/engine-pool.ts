import { env } from "$env/dynamic/private";
import { accessSync, constants } from "node:fs";
import { delimiter, join } from "node:path";
import { UciEngine, type SearchOptions, type SearchResult, type SpawnEngine } from "./uci-engine";

/** Where package managers usually put Stockfish, checked when `CHESS_ENGINE_PATH` is unset. */
const DEFAULT_LOCATIONS = [
  "/usr/games/stockfish",
  "/usr/bin/stockfish",
  "/usr/local/bin/stockfish",
  "/opt/homebrew/bin/stockfish"
];

const DEFAULT_INSTANCES = 2;
const DEFAULT_THREADS = 1;
const DEFAULT_HASH_MB = 64;
/** How long a search may wait for a free engine before giving up. */
const QUEUE_WAIT_MS = 10_000;

function isExecutable(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * The engine binary to use: `CHESS_ENGINE_PATH` if set, otherwise `stockfish`
 * on the PATH or in a common install location. Null when there is none, in
 * which case the chess tools are not offered.
 */
export function resolveEnginePath(): string | null {
  if (env.CHESS_ENGINE_PATH)
    return isExecutable(env.CHESS_ENGINE_PATH) ? env.CHESS_ENGINE_PATH : null;
  const onPath = (process.env.PATH ?? "")
    .split(delimiter)
    .filter(Boolean)
    .map((dir) => join(dir, "stockfish"));
  return [...onPath, ...DEFAULT_LOCATIONS].find(isExecutable) ?? null;
}

export function isChessEngineAvailable(): boolean {
  return resolveEnginePath() !== null;
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

interface Waiter {
  resolve: (engine: UciEngine) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export interface EnginePoolOptions {
  path: string;
  instances?: number;
  threads?: number;
  hashMb?: number;
  spawn?: SpawnEngine;
}

/**
 * A fixed number of engine processes, started on first use, handed out one
 * search at a time. Engines that die are replaced on the next request.
 */
export class EnginePool {
  private readonly engines = new Set<UciEngine>();
  private readonly idle: UciEngine[] = [];
  private readonly waiters: Waiter[] = [];
  private readonly instances: number;

  constructor(private readonly options: EnginePoolOptions) {
    this.instances = options.instances ?? DEFAULT_INSTANCES;
  }

  async search(options: SearchOptions): Promise<SearchResult> {
    const engine = await this.acquire();
    try {
      return await engine.search(options);
    } finally {
      this.release(engine);
    }
  }

  /** Stops every engine; the pool starts fresh ones if used again. */
  quit(): void {
    for (const engine of this.engines) engine.quit();
    this.engines.clear();
    this.idle.length = 0;
  }

  private async acquire(): Promise<UciEngine> {
    for (const engine of this.engines) {
      if (!engine.alive) this.forget(engine);
    }

    const idle = this.idle.pop();
    if (idle) return idle;

    if (this.engines.size < this.instances) {
      const engine = new UciEngine({
        path: this.options.path,
        threads: this.options.threads ?? DEFAULT_THREADS,
        hashMb: this.options.hashMb ?? DEFAULT_HASH_MB,
        spawn: this.options.spawn
      });
      this.engines.add(engine);
      try {
        await engine.init();
      } catch (error) {
        this.forget(engine);
        engine.quit();
        throw error;
      }
      return engine;
    }

    return new Promise<UciEngine>((resolve, reject) => {
      const waiter: Waiter = {
        resolve,
        reject,
        timer: setTimeout(() => {
          this.waiters.splice(this.waiters.indexOf(waiter), 1);
          reject(new Error("The chess engine is busy; try again in a moment"));
        }, QUEUE_WAIT_MS)
      };
      this.waiters.push(waiter);
    });
  }

  private release(engine: UciEngine): void {
    if (!engine.alive) {
      this.forget(engine);
      // Whoever is waiting gets a fresh engine instead.
      const waiter = this.waiters.shift();
      if (waiter) {
        clearTimeout(waiter.timer);
        this.acquire().then(waiter.resolve, waiter.reject);
      }
      return;
    }
    const waiter = this.waiters.shift();
    if (waiter) {
      clearTimeout(waiter.timer);
      waiter.resolve(engine);
    } else {
      this.idle.push(engine);
    }
  }

  private forget(engine: UciEngine): void {
    this.engines.delete(engine);
    const index = this.idle.indexOf(engine);
    if (index !== -1) this.idle.splice(index, 1);
  }
}

let pool: EnginePool | null = null;

/** The shared pool for the configured engine, or null when none is configured. */
export function getEnginePool(): EnginePool | null {
  const path = resolveEnginePath();
  if (!path) return null;
  pool ??= new EnginePool({
    path,
    instances: positiveInt(env.CHESS_ENGINE_INSTANCES, DEFAULT_INSTANCES),
    threads: positiveInt(env.CHESS_ENGINE_THREADS, DEFAULT_THREADS)
  });
  return pool;
}
