import { describe, expect, it } from "vitest";
import { generateAudioFilename } from "./filename";

describe("generateAudioFilename", () => {
  it("keeps letters, digits, spaces and basic punctuation", () => {
    expect(generateAudioFilename("Hello, world. It's fine")).toBe("Hello, world. It's fine.mp3");
  });

  it("replaces unsafe characters with underscores", () => {
    expect(generateAudioFilename("a/b\\c:d*e?f")).toBe("a_b_c_d_e_f.mp3");
  });

  it("trims whitespace and truncates to 100 characters", () => {
    const long = " " + "x".repeat(150) + " ";
    const name = generateAudioFilename(long);
    expect(name).toBe("x".repeat(100) + ".mp3");
  });

  it("uses the requested extension", () => {
    expect(generateAudioFilename("clip", "wav")).toBe("clip.wav");
  });

  it("rejects non-string input", () => {
    expect(() => generateAudioFilename(42 as unknown as string)).toThrow(/must be a string/);
  });
});
