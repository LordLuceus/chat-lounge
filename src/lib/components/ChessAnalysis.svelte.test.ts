import { cleanup, render, screen } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import ChessAnalysis from "./ChessAnalysis.svelte";

const FEN = "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3";
const status = { check: false, checkmate: false, stalemate: false, draw: false, gameOver: false };

describe("ChessAnalysis", () => {
  afterEach(cleanup);

  it("shows a position with its evaluation bar, lines and Lichess link", () => {
    render(ChessAnalysis, {
      chess: {
        kind: "position",
        output: {
          fen: FEN,
          sideToMove: "black",
          board: [],
          evaluation: { type: "cp", value: 17 },
          display: "+0.17",
          depth: 14,
          bestMove: "a6",
          bestMoveUci: "a7a6",
          lines: [
            {
              rank: 1,
              evaluation: { type: "cp", value: 17 },
              display: "+0.17",
              moves: ["a6", "Bxc6"]
            },
            {
              rank: 2,
              evaluation: { type: "cp", value: 25 },
              display: "+0.25",
              moves: ["Nf6", "O-O"]
            }
          ],
          legalMoves: [],
          status,
          analysisUrl: "https://lichess.org/analysis/x",
          note: ""
        }
      }
    });
    expect(screen.getByRole("meter", { name: "Evaluation +0.17" })).toHaveAttribute(
      "aria-valuenow",
      "52"
    );
    expect(screen.getByRole("img")).toHaveAttribute(
      "aria-label",
      expect.stringMatching(/^Black to move/)
    );
    expect(screen.getByTestId("suggested-move")).toBeInTheDocument();
    expect(screen.getByText("Black to move")).toBeInTheDocument();
    expect(screen.getByText("depth 14")).toBeInTheDocument();
    const lines = screen.getAllByRole("listitem");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toHaveTextContent("+0.25 Nf6 O-O");
    expect(screen.getByRole("link", { name: /Open in Lichess analysis/ })).toHaveAttribute(
      "href",
      "https://lichess.org/analysis/x"
    );
  });

  it("shows played moves with the last move tinted", () => {
    render(ChessAnalysis, {
      chess: {
        kind: "moves",
        output: {
          startFen: "",
          fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
          sideToMove: "white",
          moves: [
            { ply: 1, moveNumber: 1, side: "white", san: "e4", uci: "e2e4", fen: "" },
            { ply: 2, moveNumber: 1, side: "black", san: "e5", uci: "e7e5", fen: "" }
          ],
          board: [],
          legalMoves: [],
          status,
          pgn: "",
          analysisUrl: "https://lichess.org/analysis/y"
        }
      }
    });
    expect(screen.getByText("1. e4 e5")).toBeInTheDocument();
    expect(screen.getByText("White to move")).toBeInTheDocument();
    expect(document.querySelector('[data-square="e7"]')).toHaveClass("played");
    expect(screen.queryByRole("meter")).toBeNull();
  });

  it("summarises a game review with its critical moments", () => {
    const move = {
      ply: 24,
      moveNumber: 12,
      side: "black" as const,
      san: "Qf6",
      evaluationBefore: "-0.59",
      evaluationAfter: "+3.88",
      bestMove: "Kf7",
      centipawnLoss: 447,
      classification: "blunder" as const,
      fenBefore: FEN
    };
    render(ChessAnalysis, {
      chess: {
        kind: "game",
        output: {
          plies: 25,
          analysedPlies: { from: 1, to: 20 },
          truncated: true,
          depth: 12,
          finalEvaluation: "-5.83",
          accuracy: { white: 71.2, black: 65 },
          counts: {
            white: { inaccuracies: 0, mistakes: 1, blunders: 1 },
            black: { inaccuracies: 0, mistakes: 1, blunders: 1 }
          },
          criticalMoments: [move],
          moves: [move],
          note: ""
        }
      }
    });
    expect(screen.getByText("Accuracy: White 71.2%, Black 65%")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute(
      "aria-label",
      "Position before 12... Qf6, the game's biggest blunder."
    );
    const row = screen.getByRole("row", { name: /12\.\.\. Qf6/ });
    expect(row).toHaveTextContent("Blunder");
    expect(row).toHaveTextContent("-0.59 to +3.88");
    expect(row).toHaveTextContent("Kf7");
    expect(screen.getByText(/stopped at move 20/)).toBeInTheDocument();
  });
});
