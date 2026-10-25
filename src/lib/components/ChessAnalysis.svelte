<script lang="ts">
  import ChessBoard from "$lib/components/ChessBoard.svelte";
  import { formatMoveList, whiteWinPercent, type ChessPart } from "$lib/helpers/chess";
  import type { AnalysedMove, Evaluation, PositionStatus } from "$lib/types/chess";
  import { ExternalLink } from "@lucide/svelte";

  interface Props {
    chess: ChessPart;
  }

  const { chess }: Props = $props();

  const SIDE_NAMES = { white: "White", black: "Black" } as const;

  function statusText(status: PositionStatus): string | null {
    if (status.checkmate) return "Checkmate";
    if (status.stalemate) return "Stalemate";
    if (status.draw) return "Draw";
    if (status.check) return "Check";
    return null;
  }

  function evalBarHeight(evaluation: Evaluation): string {
    return `${Math.round(whiteWinPercent(evaluation))}%`;
  }

  function moveLabel(move: AnalysedMove): string {
    return `${move.moveNumber}.${move.side === "black" ? ".." : ""} ${move.san}`;
  }

  const CLASSIFICATION_LABELS: Record<AnalysedMove["classification"], string> = {
    best: "Best",
    good: "Good",
    inaccuracy: "Inaccuracy",
    mistake: "Mistake",
    blunder: "Blunder",
    forced: "Forced"
  };

  function percent(value: number | null): string {
    return value === null ? "n/a" : `${value}%`;
  }
</script>

<figure class="chess-analysis">
  {#if chess.kind === "position"}
    {@const { output } = chess}
    {@const status = statusText(output.status)}
    <div class="board-row">
      <div
        class="eval-bar"
        role="meter"
        aria-label="Evaluation {output.display}"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={Math.round(whiteWinPercent(output.evaluation))}
      >
        <div class="eval-white" style:height={evalBarHeight(output.evaluation)}></div>
      </div>
      <ChessBoard fen={output.fen} suggestedMove={output.bestMoveUci} />
    </div>
    <figcaption>
      <p class="summary">
        <strong class="evaluation">{output.display}</strong>
        <span>{SIDE_NAMES[output.sideToMove]} to move</span>
        {#if status}<span>{status}</span>{/if}
        {#if output.depth > 0}<span class="muted">depth {output.depth}</span>{/if}
      </p>
      {#if output.lines.length > 0}
        <ol class="lines" aria-label="Engine lines">
          {#each output.lines as line (line.rank)}
            <li>
              <strong class="evaluation">{line.display}</strong>
              <span class="moves">{line.moves.join(" ")}</span>
            </li>
          {/each}
        </ol>
      {/if}
      <a href={output.analysisUrl} target="_blank" rel="noopener noreferrer" class="lichess-link">
        Open in Lichess analysis
        <ExternalLink aria-hidden="true" size={14} />
      </a>
    </figcaption>
  {:else if chess.kind === "moves"}
    {@const { output } = chess}
    {@const status = statusText(output.status)}
    <ChessBoard fen={output.fen} lastMove={output.moves.at(-1)?.uci} />
    <figcaption>
      <p class="moves">{formatMoveList(output.moves)}</p>
      <p class="summary">
        {#if status}<span>{status}</span>{/if}
        {#if !output.status.gameOver}<span>{SIDE_NAMES[output.sideToMove]} to move</span>{/if}
      </p>
      <a href={output.analysisUrl} target="_blank" rel="noopener noreferrer" class="lichess-link">
        Open in Lichess analysis
        <ExternalLink aria-hidden="true" size={14} />
      </a>
    </figcaption>
  {:else}
    {@const { output } = chess}
    {@const highlight = output.criticalMoments[0]}
    {#if highlight}
      <ChessBoard
        fen={highlight.fenBefore}
        label="Position before {moveLabel(
          highlight
        )}, the game's biggest {highlight.classification}."
      />
    {/if}
    <figcaption>
      <p class="summary">
        <span
          >Accuracy: White {percent(output.accuracy.white)}, Black {percent(
            output.accuracy.black
          )}</span
        >
        <span class="muted">
          moves {output.analysedPlies.from} to {output.analysedPlies.to} of {output.plies}
        </span>
      </p>
      {#if output.criticalMoments.length > 0}
        <div class="table-wrap">
          <table class="critical-moments">
            <caption>Critical moments</caption>
            <thead>
              <tr>
                <th scope="col">Move</th>
                <th scope="col">Verdict</th>
                <th scope="col">Evaluation</th>
                <th scope="col">Better was</th>
              </tr>
            </thead>
            <tbody>
              {#each output.criticalMoments as move (move.ply)}
                <tr>
                  <td>{moveLabel(move)}</td>
                  <td class="verdict {move.classification}"
                    >{CLASSIFICATION_LABELS[move.classification]}</td
                  >
                  <td>{move.evaluationBefore} to {move.evaluationAfter}</td>
                  <td>{move.bestMove}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else}
        <p class="muted">No inaccuracies, mistakes or blunders found.</p>
      {/if}
      {#if output.truncated}
        <p class="muted">
          The review stopped at move {output.analysedPlies.to} to stay within the time budget.
        </p>
      {/if}
    </figcaption>
  {/if}
</figure>

<style>
  .chess-analysis {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin: 0.5rem 0;
    max-width: 28rem;
  }

  .board-row {
    display: flex;
    gap: 0.5rem;
    align-items: stretch;
  }

  .eval-bar {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    width: 0.75rem;
    flex-shrink: 0;
    border-radius: 0.25rem;
    overflow: hidden;
    background-color: #403d39;
  }

  .eval-white {
    background-color: #f5f5f5;
    transition: height 0.3s ease;
  }

  figcaption {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-size: 0.875rem;
  }

  .summary {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 0.75rem;
    margin: 0;
  }

  .evaluation {
    font-variant-numeric: tabular-nums;
  }

  .muted {
    opacity: 0.7;
  }

  .lines {
    margin: 0;
    padding-left: 1.25rem;
  }

  .lines li {
    display: flex;
    gap: 0.5rem;
    align-items: baseline;
  }

  .moves {
    margin: 0;
  }

  .table-wrap {
    overflow-x: auto;
  }

  .lichess-link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    align-self: flex-start;
    text-decoration: underline;
  }

  .critical-moments {
    border-collapse: collapse;
    width: 100%;
  }

  .critical-moments caption {
    text-align: left;
    font-weight: 600;
    padding-bottom: 0.25rem;
  }

  .critical-moments th,
  .critical-moments td {
    text-align: left;
    padding: 0.2rem 0.5rem 0.2rem 0;
    border-bottom: 1px solid hsl(var(--border));
    vertical-align: top;
  }

  .verdict.blunder {
    color: hsl(0 72% 51%);
  }

  .verdict.mistake {
    color: hsl(25 95% 45%);
  }

  .verdict.inaccuracy {
    color: hsl(45 93% 40%);
  }
</style>
