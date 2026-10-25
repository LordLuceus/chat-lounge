import { cleanup, render, screen } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import ChessBoard from "./ChessBoard.svelte";

const AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";

describe("ChessBoard", () => {
  afterEach(cleanup);

  it("draws the pieces with a spoken description", () => {
    render(ChessBoard, { fen: AFTER_E4 });
    const board = screen.getByRole("img");
    expect(board).toHaveAttribute(
      "aria-label",
      expect.stringMatching(/^Black to move\. White: king e1/)
    );
    expect(document.querySelectorAll("rect")).toHaveLength(64);
    expect(document.querySelectorAll(".piece")).toHaveLength(32);
    expect(document.querySelectorAll(".piece.white")).toHaveLength(16);
    expect(document.querySelector('[data-piece="P"]')).toBeInTheDocument();
    expect(document.querySelector('[data-square="e4"]')).not.toHaveClass("played");
    expect(document.querySelector('[data-square="a1"]')).toHaveClass("dark");
    expect(document.querySelector('[data-square="h1"]')).toHaveClass("light");
  });

  it("tints the last move and draws the suggested move as an arrow", () => {
    render(ChessBoard, {
      fen: AFTER_E4,
      lastMove: "e2e4",
      suggestedMove: "c7c5",
      label: "Sicilian"
    });
    expect(screen.getByRole("img")).toHaveAttribute("aria-label", "Sicilian");
    expect(document.querySelector('[data-square="e2"]')).toHaveClass("played");
    expect(document.querySelector('[data-square="e4"]')).toHaveClass("played");
    expect(document.querySelectorAll(".played")).toHaveLength(2);
    const arrow = screen.getByTestId("suggested-move");
    // c7 is the third file from the left, second rank from the top; c5 two ranks lower.
    expect(arrow).toHaveAttribute("x1", "25");
    expect(arrow).toHaveAttribute("y1", "15");
    expect(arrow).toHaveAttribute("x2", "25");
    expect(Number(arrow.getAttribute("y2"))).toBeCloseTo(31.5);
  });

  it("says when the position cannot be drawn", () => {
    render(ChessBoard, { fen: "not a position" });
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText(/Invalid position/)).toBeInTheDocument();
  });
});
