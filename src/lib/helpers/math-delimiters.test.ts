import { describe, expect, it } from "vitest";
import { normalizeMathDelimiters } from "./math-delimiters";

describe("normalizeMathDelimiters", () => {
  it("rewrites \\( \\) and \\[ \\] to dollar delimiters", () => {
    expect(normalizeMathDelimiters("Euler: \\(e^{i\\pi} + 1 = 0\\).")).toBe(
      "Euler: $e^{i\\pi} + 1 = 0$."
    );
    expect(normalizeMathDelimiters("Area:\n\\[\nA = \\pi r^2\n\\]\ndone")).toBe(
      "Area:\n$$\nA = \\pi r^2\n$$\ndone"
    );
  });

  it("leaves unmatched delimiters and other escapes alone", () => {
    expect(normalizeMathDelimiters("open \\( only")).toBe("open \\( only");
    expect(normalizeMathDelimiters("a \\\\[2pt] b and \\$5")).toBe("a \\\\[2pt] b and \\$5");
  });

  it("does not touch fenced or inline code", () => {
    const md = "Use `\\(x\\)` or:\n\n```tex\n\\[ y \\] and $5 and $10\n```\n\nthen \\(z\\)";
    expect(normalizeMathDelimiters(md)).toBe(
      "Use `\\(x\\)` or:\n\n```tex\n\\[ y \\] and $5 and $10\n```\n\nthen $z$"
    );
  });

  it("escapes dollars that read as currency but keeps inline maths", () => {
    // Only the opening dollar needs escaping; an unmatched one is literal anyway.
    expect(normalizeMathDelimiters("Costs $5 and $10 total.")).toBe("Costs \\$5 and $10 total.");
    expect(normalizeMathDelimiters("From $ 5 to $ 10.")).toBe("From \\$ 5 to $ 10.");
    expect(normalizeMathDelimiters("Pay $5, then $x^2 + 1$ holds.")).toBe(
      "Pay \\$5, then $x^2 + 1$ holds."
    );
    expect(normalizeMathDelimiters("Solve $2x + 3 = 7$ for $x$.")).toBe(
      "Solve $2x + 3 = 7$ for $x$."
    );
    expect(normalizeMathDelimiters("It costs $5.")).toBe("It costs $5.");
  });

  it("copies $$ spans verbatim", () => {
    expect(normalizeMathDelimiters("$$\n\\$5 + \\$10\n$$")).toBe("$$\n\\$5 + \\$10\n$$");
    expect(normalizeMathDelimiters("inline $$a = b$$ here")).toBe("inline $$a = b$$ here");
  });
});
