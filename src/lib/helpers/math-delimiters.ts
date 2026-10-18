/**
 * Rewrites the LaTeX delimiters models commonly emit into the dollar forms
 * remark-math understands, leaving fenced and inline code untouched:
 *
 *   \( … \)  →  $ … $
 *   \[ … \]  →  $$ … $$
 *
 * A lone "$" that reads as currency rather than maths ("$5 and $10") is
 * escaped so remark-math does not turn the words between the two amounts
 * into an equation. A "$…$" span counts as maths when the opening "$" is
 * followed by a non-space, the closing "$" is preceded by a non-space and is
 * not followed by a digit (the rule Pandoc uses).
 */
export function normalizeMathDelimiters(markdown: string): string {
  const out: string[] = [];
  let prose: string[] = [];
  let fence: { marker: string; length: number } | null = null;

  const flushProse = () => {
    if (prose.length > 0) {
      out.push(normalizeProse(prose.join("\n")));
      prose = [];
    }
  };

  for (const line of markdown.split("\n")) {
    if (fence) {
      out.push(line);
      const close = /^ {0,3}(`{3,}|~{3,})\s*$/.exec(line);
      if (close && close[1][0] === fence.marker && close[1].length >= fence.length) {
        fence = null;
      }
      continue;
    }
    const open = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (open) {
      flushProse();
      out.push(line);
      fence = { marker: open[1][0], length: open[1].length };
      continue;
    }
    prose.push(line);
  }
  flushProse();

  return out.join("\n");
}

function normalizeProse(text: string): string {
  let out = "";
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (ch === "`") {
      // Inline code: copy through the matching run of backticks.
      const run = runLength(text, i, "`");
      const close = findBacktickRun(text, i + run, run);
      const end = close === -1 ? i + run : close + run;
      out += text.slice(i, end);
      i = end;
      continue;
    }

    if (ch === "\\") {
      const next = text[i + 1];
      if (next === "(" || next === "[") {
        const closer = next === "(" ? "\\)" : "\\]";
        const close = text.indexOf(closer, i + 2);
        if (close !== -1) {
          const dollars = next === "(" ? "$" : "$$";
          out += dollars + text.slice(i + 2, close) + dollars;
          i = close + 2;
          continue;
        }
      }
      // Any other escape (including "\$" and "\\") is copied as a pair so
      // the character after it is never mistaken for a delimiter.
      out += text.slice(i, i + 2);
      i += 2;
      continue;
    }

    if (ch === "$") {
      if (text[i + 1] === "$") {
        const close = text.indexOf("$$", i + 2);
        const end = close === -1 ? i + 2 : close + 2;
        out += text.slice(i, end);
        i = end;
        continue;
      }
      const close = findClosingDollar(text, i + 1);
      if (close !== -1 && looksLikeMath(text, i, close)) {
        out += text.slice(i, close + 1);
        i = close + 1;
        continue;
      }
      out += close === -1 ? "$" : "\\$";
      i++;
      continue;
    }

    out += ch;
    i++;
  }

  return out;
}

function runLength(text: string, from: number, char: string): number {
  let end = from;
  while (text[end] === char) end++;
  return end - from;
}

/** Index of the next run of exactly `length` backticks, or -1. */
function findBacktickRun(text: string, from: number, length: number): number {
  let i = from;
  while (i < text.length) {
    if (text[i] !== "`") {
      i++;
      continue;
    }
    const run = runLength(text, i, "`");
    if (run === length) return i;
    i += run;
  }
  return -1;
}

/**
 * Index of the closing "$" for an inline span opened just before `from`, or
 * -1 when none follows within the paragraph. Escaped dollars are skipped, and
 * the search stops at a blank line or at inline code.
 */
function findClosingDollar(text: string, from: number): number {
  for (let i = from; i < text.length; i++) {
    const ch = text[i];
    if (ch === "\\") {
      i++;
    } else if (ch === "$") {
      return i;
    } else if (ch === "`" || (ch === "\n" && text[i + 1] === "\n")) {
      return -1;
    }
  }
  return -1;
}

function looksLikeMath(text: string, open: number, close: number): boolean {
  const afterOpen = text[open + 1];
  const beforeClose = text[close - 1];
  const afterClose = text[close + 1];
  return (
    !/\s/.test(afterOpen) &&
    !/\s/.test(beforeClose) &&
    !(afterClose !== undefined && /\d/.test(afterClose))
  );
}
