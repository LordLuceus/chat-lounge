# Chess engine integration: design exploration

How Chat Lounge could let the chat models call a chess engine (Stockfish) to
analyse positions and games, instead of guessing evaluations from memory.

This is a design note, not an implementation. It is based on how the existing
tools (`webSearch`, `fetchWebpage`, `generateImage`) are wired in.

## Where it plugs in today

The tool pipeline already has every hook a chess tool needs:

- **Tool registry**: `createTools()` in `src/lib/server/tools/index.ts` builds the
  tool set per request. `generateImage` shows the pattern for a tool that is
  only offered when something is available (a key, here: an engine).
- **Guidelines**: `prepareSystemPrompt()` in `src/lib/server/ai-service.ts`
  splices `image_generation_guidelines.md` into `tool_use_guidelines.md` only
  when the image tool is offered. A `chess_guidelines.md` would be spliced the
  same way.
- **Gating**: tools are only passed to `streamText` when `model.supportsTools`,
  and the agent loop runs with `stopWhen: stepCountIs(20)`, so a model can make
  several engine calls per reply (this matters for cost limits, below).
- **Output contract**: tools return `{ success: false, message }` instead of
  throwing, so the model can explain failures to the user.
- **UI**: `ToolCallDisplay.svelte` renders any `tool-*` part generically
  (collapsible input/output JSON). `MessageContent.svelte` special-cases
  `tool-generateImage`; a board renderer would be added the same way.
- **Tests**: `tools.test.ts` calls tool `execute` functions directly with mocked
  dependencies; an engine tool would mock the UCI process the same way.

So the work is: an engine, a thin UCI client, two or three tools, a guidelines
file, Docker changes, and optionally a board component.

## Option A: native Stockfish in the app container (recommended)

Install the `stockfish` binary in the runtime stage of the `Dockerfile` and talk
to it over the UCI protocol via `child_process.spawn`.

```dockerfile
# runtime stage
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates stockfish \
    && rm -rf /var/lib/apt/lists/*
ENV CHESS_ENGINE_PATH=/usr/games/stockfish
```

Debian's packaged version lags upstream. If that matters, download the official
release binary (`stockfish-ubuntu-x86-64-avx2`) in the builder stage and copy it
across instead. Either way the NNUE network is embedded in the binary, so there
is no separate data file to ship.

Pros

- Strongest and fastest option: real threads, SIMD, the full network.
- No new npm dependency for the engine itself.
- Zero network dependency, works offline and for any position.

Cons

- Engine CPU runs inside the app container next to the web server. Needs a
  concurrency cap and bounded search (see "Resource limits").
- Adds roughly 50 MB to the image.
- Developers need Stockfish installed locally (`brew install stockfish`,
  `apt install stockfish`), or the tool is simply not offered in dev.

## Option B: Stockfish compiled to WebAssembly (npm `stockfish`)

The `stockfish` npm package (currently Stockfish 19) runs the engine in Node
with no system dependency. The `lite-single` flavour is about 1.7 MB and is
still far stronger than any human; the `full` flavour is about 94 MB.

Pros

- Zero-setup for developers and CI; no Dockerfile change.
- Same UCI protocol, so the client code is identical to option A.

Cons

- The package is about 205 MB unpacked because it ships every flavour; it
  would sit in `node_modules` in the image unless pruned by hand.
- Single-threaded flavours ignore `Threads`; multi-threaded WASM is slower than
  native and needs `SharedArrayBuffer`.
- The lite network is noticeably weaker at low depth than the full engine.

Best use: a fallback when `CHESS_ENGINE_PATH` is unset, so the tool works in dev
and tests without installing anything. Whether that is worth 205 MB in the
image is a judgement call; it could be a devDependency used only by tests.

## Option C: engine sidecar in docker-compose

Run Stockfish in its own container with a small UCI-over-HTTP (or WebSocket)
wrapper, and have the tool call it over the compose network like it already does
for Valkey and MariaDB.

Pros

- Isolates CPU and memory from the web server; compose `deploy.resources`
  limits apply cleanly. Can be scaled or moved to a bigger host later.
- Engine upgrades are a one-line image bump.

Cons

- A second service to write and operate (there is no well-maintained
  off-the-shelf Stockfish HTTP image; most are hobby projects).
- Another network hop and another failure mode.

Reasonable later step if engine load ever hurts request latency. Not needed to
start.

## Option D: external evaluation APIs

- **Lichess cloud eval** (`GET https://lichess.org/api/cloud-eval?fen=...&multiPv=N`):
  free, no key, returns cached Stockfish evaluations with PVs. Only covers
  positions already in Lichess's cache (opening theory and popular games);
  anything else returns 404. Rate-limited.
- **Lichess tablebase** (`https://tablebase.lichess.ovh/standard?fen=...`):
  perfect results for positions with 7 or fewer pieces. Free, no key.
- Third-party "Stockfish as a service" APIs exist but are hobby-run and
  unreliable, not a base to build on.

These cannot be the primary engine (coverage gaps), but cloud eval is an
excellent fast path for openings and tablebase is strictly better than any
engine for endgames. Both fit the existing pattern of calling an external API
from a tool (like Exa). Note that user positions would be sent to a third party.

## Option E: run the engine in the user's browser

The AI SDK supports client-executed tools (define the tool without `execute`,
handle it in the client's `onToolCall`, return the result with `addToolOutput`).
Stockfish WASM would then run on the user's machine and cost the server nothing.

Not recommended for v1: it changes the streaming flow in `Chat.svelte`, breaks
when the tab is closed or on mobile, and gives inconsistent strength across
devices. Worth remembering if server CPU becomes the constraint.

## Recommendation

1. **Engine**: native Stockfish in the image (A), path from `CHESS_ENGINE_PATH`.
   Tool is offered only when the binary resolves, mirroring how `generateImage`
   is gated on an API key.
2. **Rules library**: `chess.js` (about 1.4 MB, no dependencies) for FEN and PGN
   parsing, legality checks, SAN <-> UCI conversion, and ASCII boards. The
   engine should never see an unvalidated string.
3. **Optional extras**: Lichess cloud eval as an opening fast path and the
   Lichess tablebase for 7-piece endgames, each behind a try/fallback to the
   local engine.

## Tool surface

Keep it to three tools so the model's tool list stays small.

### `analyzePosition`

Input (all optional except one of `fen` / `pgn` / `moves`):

| Field     | Meaning                                                            |
| --------- | ------------------------------------------------------------------ |
| `fen`     | Position to analyse                                                |
| `pgn`     | Alternatively a game; analyses the final position unless `ply` set |
| `moves`   | Alternatively SAN or UCI moves from the start position             |
| `ply`     | With `pgn`/`moves`: analyse the position after this half-move      |
| `depth`   | Search depth, clamped (e.g. 8 to 22, default 18)                   |
| `multiPv` | Number of candidate lines, clamped 1 to 5, default 3               |

Output:

```json
{
  "success": true,
  "fen": "...",
  "sideToMove": "white",
  "board": "  +------------------------+\n8 | r  n  b  q ... (ascii from chess.js)",
  "evaluation": { "type": "cp", "value": 35, "perspective": "white" },
  "depth": 18,
  "lines": [
    { "rank": 1, "evaluation": { "type": "cp", "value": 35 }, "moves": ["Nf3", "Nc6", "Bb5"] },
    { "rank": 2, "evaluation": { "type": "cp", "value": 20 }, "moves": ["d4", "exd4", "Nxd4"] }
  ],
  "legalMoves": ["a3", "a4", "..."],
  "status": { "check": false, "checkmate": false, "stalemate": false, "draw": false },
  "analysisUrl": "https://lichess.org/analysis/<fen>"
}
```

Design notes:

- Return moves in **SAN**, not UCI. Models read `Nf3` far more reliably than
  `g1f3`. Convert with chess.js by replaying the PV.
- **Normalise evaluations to White's perspective** and say so in the output.
  UCI reports from the side to move, which models routinely get backwards.
- Include the ASCII board and the legal move list. Models are poor at tracking
  piece placement from FEN alone; these two fields cut hallucinated moves
  dramatically and cost little.
- Accepting `pgn`/`moves` matters because models are also poor at writing FEN.
  Let them hand over the game as the user pasted it.

### `analyzeGame`

Input: `pgn`, optional `depth` (lower default, e.g. 14), optional `from`/`to`
ply range, optional `movetimeMs` per ply.

Output: per-ply `{ ply, move, evalBefore, evalAfter, bestMove, centipawnLoss, classification }`
with `classification` in inaccuracy / mistake / blunder / book / forced, plus a
summary (accuracy per side, the three largest swings, final result). This is
what "analyse my game" needs and what models cannot do by repeatedly calling
`analyzePosition` within a 20-step budget.

Cost control: a 40-move game at depth 14 is 80 searches. Use `go movetime` per
ply (e.g. 300 ms) rather than depth so the total is bounded (about 25 s
worst case), and cap the ply range (e.g. 120 plies). If longer or deeper runs
are wanted later, move this to a BullMQ job on the existing Valkey queue with
Socket.io progress, the same way conversation import works, and have the tool
return a job reference plus the first results.

### `makeMoves`

Pure chess.js, no engine: `{ fen?, pgn?, moves[] }` -> resulting FEN, SAN of
each move, legal replies, game status, ASCII board. Lets the model verify a
line it wants to discuss, or set up a position for `analyzePosition`, without
hallucinating. Cheap enough to call freely.

## Server module layout

```
src/lib/server/chess/
  uci-engine.ts      spawn + UCI protocol (uci, isready, setoption, position, go, stop)
  engine-pool.ts     N engines, FIFO queue, per-request abort, hard timeouts
  analysis.ts        analyzePosition / analyzeGame logic on top of the pool, chess.js
  cloud-eval.ts      optional Lichess cloud eval + tablebase fast paths
src/lib/server/tools/
  chess.ts           the three `tool()` definitions, thin wrappers over analysis.ts
src/lib/data/
  chess_guidelines.md  spliced into tool_use_guidelines when the tool is offered
```

UCI client essentials:

- On start: `uci`, wait `uciok`; `setoption name Threads value N`,
  `setoption name Hash value 64`; `isready`, wait `readyok`.
- Per search: `ucinewgame` (optional, clears hash), `position fen <fen>`,
  `setoption name MultiPV value K`, `go depth D` or `go movetime T`.
- Parse `info depth .. multipv .. score cp|mate .. pv ..` lines, keep the
  latest per `multipv`, finish on `bestmove`.
- On `abortSignal` (passed to `execute` by the AI SDK): send `stop`, wait for
  `bestmove`, return what was found so far. Kill and respawn on protocol
  timeout.
- Strip newlines and control characters from anything interpolated into a UCI
  command; validate the FEN with chess.js first.

Engine pool: one process per allowed concurrent search (2 is a sensible default
on the current single-host deploy), requests queue FIFO, queue wait capped
(e.g. 10 s) so a busy engine returns a "try again" error rather than hanging the
chat stream.

## Resource limits and safety

- Clamp `depth` and `multiPv`; cap wall time per search (e.g. 8 s) with
  `stop`. The 20-step agent loop means one reply could trigger 20 searches, so
  also cap total engine time per request (e.g. 30 s) and refuse further calls
  past that.
- `Threads` at most CPU count minus one; `Hash` small (64 MB per engine).
- Treat PGN and FEN as untrusted input: size caps (PGN under 20 KB), chess.js
  parse errors returned as `{ success: false, message }`.
- Game analysis stays on the request path only while it is bounded; anything
  slower belongs on the queue.

## UI

Day one needs nothing: `ToolCallDisplay` already shows input and output. Three
cheap improvements after that, following the `tool-generateImage` special case
in `MessageContent.svelte`:

1. **Board diagram**: a `ChessBoard.svelte` rendering a FEN as an 8x8 SVG with
   Unicode or inline SVG pieces. No dependency needed; 64 squares and 12 glyphs.
   Give it an accessible description (the FEN and side to move) since the app
   cares about screen-reader users.
2. **Eval bar and lines**: show the evaluation and the top PVs under the board.
3. **Open in Lichess** link using the `analysisUrl` field.

`SharedMessage.svelte` renders shared snapshots; check it falls back to the
generic display so shared conversations with engine calls still render.

## Prompt guidelines (`chess_guidelines.md`)

Points the guidelines should make, since model behaviour here is the main
quality lever:

- Use `analyzePosition` whenever evaluating a position or suggesting a move;
  never give an evaluation or "best move" from memory when the tool is
  available.
- Use `makeMoves` to verify any line before presenting it.
- Evaluations are from White's perspective; translate for the user
  ("+1.2 means White is better by about a pawn").
- Pass the game as PGN or a move list rather than constructing FEN by hand.
- When the engine disagrees with the model's intuition, trust the engine and
  explain the line, do not argue with it.
- Prefer `analyzeGame` once for whole-game review rather than many
  `analyzePosition` calls.

## Testing

- `uci-engine.ts`: unit test with a fake child process (an `EventEmitter` with
  `stdin`/`stdout` streams) that scripts `uciok`, `readyok`, a few `info`
  lines and `bestmove`. Covers parsing, MultiPV bookkeeping, abort and
  timeout.
- `analysis.ts` and the tools: real chess.js, mocked pool. Covers FEN/PGN
  input variants, SAN conversion of PVs, perspective normalisation,
  classification thresholds, and error messages.
- `createTools`: assert the chess tools appear only when an engine is
  configured (same shape as the existing `generateImage` test).
- Optional integration test that runs only when `CHESS_ENGINE_PATH` is set.

## Phased delivery

1. **Position analysis** (one PR): chess.js, UCI client and pool, `analyzePosition`
   and `makeMoves`, guidelines file and splice, `CHESS_ENGINE_PATH`, Dockerfile
   install, tests, changelog entry, AGENTS.md environment variable list.
2. **Game review**: `analyzeGame` with per-move classification; queue-backed
   variant only if the bounded version proves too slow.
3. **Board rendering**: `ChessBoard.svelte`, eval display, Lichess link.
4. **Fast paths**: Lichess cloud eval for openings, tablebase for endgames,
   optional ECO opening names from the public-domain Lichess openings dataset.

## Decisions and status

- **Always on**: no per-user setting. The engine costs nothing until a
  conversation turns to chess, and the tools need no third-party key.
- **Hardware**: production is a 4-core VPS running only this app. The pool
  defaults to two engine processes with one thread each (overridable with
  `CHESS_ENGINE_INSTANCES` and `CHESS_ENGINE_THREADS`), leaving two cores for
  the web server.
- **Variants**: standard chess only.
- **Phase 1 and 2 are implemented**: `analyzePosition`, `makeMoves` and
  `analyzeGame` in `src/lib/server/tools/chess.ts`, on top of
  `src/lib/server/chess/`. Game review is bounded to a 30-second engine budget
  per call and reports when it had to stop early. The board renderer, Lichess
  fast paths and opening names remain to do.
