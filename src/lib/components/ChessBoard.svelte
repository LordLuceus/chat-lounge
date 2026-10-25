<script lang="ts">
  import {
    describePosition,
    FILES,
    parseFenBoard,
    squareCoordinates,
    uciSquares,
    type PieceChar
  } from "$lib/helpers/chess";

  interface Props {
    fen: string;
    /** A move just played, in UCI; its squares are tinted. */
    lastMove?: string | null;
    /** A suggested move, in UCI; drawn as an arrow. */
    suggestedMove?: string | null;
    /** Spoken description; defaults to the pieces and side to move. */
    label?: string;
  }

  const { fen, lastMove = null, suggestedMove = null, label }: Props = $props();

  const SQUARE = 10;

  const board = $derived(parseFenBoard(fen));
  const description = $derived(label ?? describePosition(fen));
  const played = $derived(uciSquares(lastMove));
  const suggested = $derived(uciSquares(suggestedMove));

  // The solid glyphs are used for both colours and filled, so pieces look the
  // same whatever font the browser picks; the text presentation selector
  // stops platforms turning the pawn into an emoji.
  const GLYPHS: Record<Lowercase<PieceChar>, string> = {
    k: "♚︎",
    q: "♛︎",
    r: "♜︎",
    b: "♝︎",
    n: "♞︎",
    p: "♟︎"
  };

  function centre(square: string) {
    const coordinates = squareCoordinates(square);
    if (!coordinates) return null;
    return { x: coordinates.file * SQUARE + SQUARE / 2, y: coordinates.rank * SQUARE + SQUARE / 2 };
  }

  const arrow = $derived.by(() => {
    if (!suggested) return null;
    const from = centre(suggested.from);
    const to = centre(suggested.to);
    if (!from || !to) return null;
    // Stop short of the centre so the arrowhead does not cover the piece.
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy) || 1;
    const shorten = SQUARE * 0.35;
    return {
      x1: from.x,
      y1: from.y,
      x2: to.x - (dx / length) * shorten,
      y2: to.y - (dy / length) * shorten
    };
  });

  function isLight(fileIndex: number, rankIndex: number): boolean {
    return (fileIndex + rankIndex) % 2 === 0;
  }

  function squareName(fileIndex: number, rankIndex: number): string {
    return `${FILES[fileIndex]}${8 - rankIndex}`;
  }
</script>

{#if board}
  <svg
    class="chess-board"
    viewBox="0 0 {SQUARE * 8} {SQUARE * 8}"
    role="img"
    aria-label={description}
  >
    <title>{description}</title>
    <defs>
      <marker
        id="chess-arrowhead"
        viewBox="0 0 10 10"
        refX="5"
        refY="5"
        markerWidth="4"
        markerHeight="4"
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" class="arrow" />
      </marker>
    </defs>
    {#each board as rank, rankIndex (rankIndex)}
      {#each rank as piece, fileIndex (fileIndex)}
        {@const name = squareName(fileIndex, rankIndex)}
        <rect
          x={fileIndex * SQUARE}
          y={rankIndex * SQUARE}
          width={SQUARE}
          height={SQUARE}
          class:light={isLight(fileIndex, rankIndex)}
          class:dark={!isLight(fileIndex, rankIndex)}
          class:played={played?.from === name || played?.to === name}
          data-square={name}
        />
        {#if fileIndex === 0}
          <text
            x={0.6}
            y={rankIndex * SQUARE + 2.4}
            class="coordinate"
            class:on-light={isLight(fileIndex, rankIndex)}
            aria-hidden="true">{8 - rankIndex}</text
          >
        {/if}
        {#if rankIndex === 7}
          <text
            x={fileIndex * SQUARE + SQUARE - 0.6}
            y={SQUARE * 8 - 0.7}
            text-anchor="end"
            class="coordinate"
            class:on-light={isLight(fileIndex, rankIndex)}
            aria-hidden="true">{FILES[fileIndex]}</text
          >
        {/if}
        {#if piece}
          <text
            x={fileIndex * SQUARE + SQUARE / 2}
            y={rankIndex * SQUARE + SQUARE * 0.8}
            text-anchor="middle"
            class="piece"
            class:white={piece === piece.toUpperCase()}
            class:black={piece !== piece.toUpperCase()}
            data-piece={piece}
            aria-hidden="true">{GLYPHS[piece.toLowerCase() as Lowercase<PieceChar>]}</text
          >
        {/if}
      {/each}
    {/each}
    {#if arrow}
      <line
        x1={arrow.x1}
        y1={arrow.y1}
        x2={arrow.x2}
        y2={arrow.y2}
        class="arrow"
        marker-end="url(#chess-arrowhead)"
        data-testid="suggested-move"
      />
    {/if}
  </svg>
{:else}
  <p class="text-sm opacity-80">Invalid position: {fen}</p>
{/if}

<style>
  .chess-board {
    display: block;
    width: 100%;
    max-width: 24rem;
    aspect-ratio: 1;
    border-radius: 0.25rem;
    overflow: hidden;
    user-select: none;
  }

  rect.light {
    fill: #f0d9b5;
  }

  rect.dark {
    fill: #b58863;
  }

  rect.played.light {
    fill: #cdd26a;
  }

  rect.played.dark {
    fill: #aaa23a;
  }

  .piece {
    font-family:
      "Segoe UI Symbol", "Noto Sans Symbols 2", "DejaVu Sans", "Apple Symbols", "Symbola", serif;
    font-size: 9px;
    paint-order: stroke fill;
    stroke-linejoin: round;
  }

  .piece.white {
    fill: #fff;
    stroke: #1f1f1f;
    stroke-width: 0.5px;
  }

  .piece.black {
    fill: #1f1f1f;
    stroke: #000;
    stroke-width: 0.25px;
  }

  .coordinate {
    font-family: ui-sans-serif, system-ui, sans-serif;
    font-size: 2px;
    font-weight: 600;
    fill: #b58863;
  }

  .coordinate.on-light {
    fill: #b58863;
  }

  .coordinate:not(.on-light) {
    fill: #f0d9b5;
  }

  line.arrow {
    stroke: rgba(21, 120, 27, 0.85);
    stroke-width: 1.4px;
    stroke-linecap: round;
  }

  path.arrow {
    fill: rgba(21, 120, 27, 0.85);
  }
</style>
