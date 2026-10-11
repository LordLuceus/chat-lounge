import { describe, expect, it } from "vitest";
import { getGeneratedImage, isGeneratingImage } from "./generated-image";

const part = (overrides: Record<string, unknown>) =>
  ({ type: "tool-generateImage", toolCallId: "c1", ...overrides }) as never;

describe("getGeneratedImage", () => {
  it("returns the stored image once the tool has succeeded", () => {
    expect(
      getGeneratedImage(
        part({
          state: "output-available",
          input: { prompt: "a fox" },
          output: { success: true, key: "u/fox.png", mediaType: "image/png", filename: "fox.png" }
        })
      )
    ).toEqual({ key: "u/fox.png", mediaType: "image/png", filename: "fox.png", prompt: "a fox" });
  });

  it("prefers the prompt the image model actually used", () => {
    expect(
      getGeneratedImage(
        part({
          state: "output-available",
          input: { prompt: "a fox" },
          output: { success: true, key: "k", revisedPrompt: "a red fox in snow" }
        })
      )?.prompt
    ).toBe("a red fox in snow");
  });

  it("is null while running, on failure, or for other parts", () => {
    expect(
      getGeneratedImage(part({ state: "input-available", input: { prompt: "x" } }))
    ).toBeNull();
    expect(
      getGeneratedImage(
        part({ state: "output-available", output: { success: false, message: "no" } })
      )
    ).toBeNull();
    expect(
      getGeneratedImage(part({ state: "output-available", output: { success: true } }))
    ).toBeNull();
    expect(getGeneratedImage({ type: "text", text: "hi" })).toBeNull();
  });
});

describe("isGeneratingImage", () => {
  it("is true only while the tool waits on the image model", () => {
    expect(isGeneratingImage(part({ state: "input-streaming" }))).toBe(true);
    expect(isGeneratingImage(part({ state: "input-available" }))).toBe(true);
    expect(isGeneratingImage(part({ state: "output-available" }))).toBe(false);
    expect(isGeneratingImage({ type: "text", text: "" })).toBe(false);
  });
});
