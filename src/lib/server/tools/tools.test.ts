import { beforeEach, describe, expect, it, vi } from "vitest";

const exa = vi.hoisted(() => ({
  searchAndContents: vi.fn(),
  getContents: vi.fn()
}));
vi.mock("exa-js", () => ({
  default: class {
    searchAndContents = exa.searchAndContents;
    getContents = exa.getContents;
  }
}));
vi.mock("$lib/server/r2-storage", () => ({ uploadGeneratedImageToR2: vi.fn() }));

const { env } = await import("$env/dynamic/private");
const { createTools } = await import("./index");
const { currentTime } = await import("./current-time");
const { webSearch } = await import("./web-search");
const { fetchWebpage } = await import("./fetch-webpage");

const callOptions = { toolCallId: "call", messages: [] };

/** Runs a tool and returns its (non-streaming) output. */
async function run<T>(
  tool: { execute?: (input: never, options: typeof callOptions) => unknown },
  input: unknown
): Promise<T> {
  return (await tool.execute!(input as never, callOptions)) as T;
}

type TimeOutput = { timezone: string; time: string; date: string; timestamp: string };

beforeEach(() => {
  env.EXA_API_KEY = "exa-key";
  exa.searchAndContents.mockReset();
  exa.getContents.mockReset();
});

describe("createTools", () => {
  it("offers the image tool only when an image model is available", () => {
    expect(Object.keys(createTools()).sort()).toEqual(["currentTime", "fetchWebpage", "webSearch"]);
    const withImage = createTools({
      imageGeneration: {
        userId: "u1",
        apiKey: "k",
        model: { provider: "openai", id: "gpt-image-2", name: "GPT Image 2" } as never
      }
    });
    expect(Object.keys(withImage)).toContain("generateImage");
    expect(withImage.generateImage?.description).toContain("GPT Image 2");
  });
});

describe("currentTime", () => {
  it("reports the time in UTC by default and in a given zone", async () => {
    const utc = await run<TimeOutput>(currentTime, {});
    expect(utc).toMatchObject({ timezone: "UTC" });
    expect(utc.time).toMatch(/UTC$/);
    expect(new Date(utc.timestamp).toString()).not.toBe("Invalid Date");

    const tokyo = await run<TimeOutput>(currentTime, { timezone: "Asia/Tokyo" });
    expect(tokyo.timezone).toBe("Asia/Tokyo");
    expect(tokyo.time).toMatch(/[AP]M$/);
  });

  it("rejects unknown time zones", async () => {
    await expect(run(currentTime, { timezone: "Mars/Olympus" })).rejects.toThrow(
      /Invalid timezone/
    );
  });
});

describe("webSearch", () => {
  it("returns trimmed results from Exa", async () => {
    exa.searchAndContents.mockResolvedValueOnce({
      results: [
        {
          title: "T",
          url: "https://a",
          summary: "S",
          highlights: ["h"],
          publishedDate: "2026-01-01",
          text: "ignored"
        }
      ]
    });
    const result = await run(webSearch, { query: "news" });
    expect(result).toEqual({
      success: true,
      results: [
        {
          title: "T",
          url: "https://a",
          summary: "S",
          highlights: ["h"],
          publishedDate: "2026-01-01"
        }
      ]
    });
    expect(exa.searchAndContents).toHaveBeenCalledWith(
      "news",
      expect.objectContaining({ numResults: 5 })
    );
  });

  it("explains missing configuration, empty results and failures", async () => {
    env.EXA_API_KEY = "";
    expect(await run(webSearch, { query: "x" })).toMatchObject({
      success: false,
      message: expect.stringContaining("EXA_API_KEY")
    });

    env.EXA_API_KEY = "k";
    exa.searchAndContents.mockResolvedValueOnce({ results: [] });
    expect(await run(webSearch, { query: "x" })).toMatchObject({
      success: false,
      message: expect.stringContaining("No results")
    });

    exa.searchAndContents.mockRejectedValueOnce(new Error("quota"));
    expect(await run(webSearch, { query: "x" })).toEqual({
      success: false,
      message: "Search failed: quota"
    });
  });
});

describe("fetchWebpage", () => {
  it("returns the page content from Exa", async () => {
    exa.getContents.mockResolvedValueOnce({
      results: [{ title: "Page", url: "https://p", summary: "sum", text: "body", author: "me" }]
    });
    expect(await run(fetchWebpage, { url: "https://p" })).toMatchObject({
      success: true,
      title: "Page",
      content: "body",
      author: "me"
    });
    expect(exa.getContents).toHaveBeenCalledWith(["https://p"], { text: true, summary: true });
  });

  it("reports failures without throwing", async () => {
    exa.getContents.mockResolvedValueOnce({ results: [] });
    expect(await run(fetchWebpage, { url: "https://p" })).toMatchObject({ success: false });
    exa.getContents.mockRejectedValueOnce(new Error("blocked"));
    expect(await run(fetchWebpage, { url: "https://p" })).toEqual({
      success: false,
      message: "Fetch failed: blocked"
    });
  });

  it("only accepts URLs", () => {
    const schema = fetchWebpage.inputSchema as unknown as {
      safeParse(value: unknown): { success: boolean };
    };
    expect(schema.safeParse({ url: "not a url" }).success).toBe(false);
    expect(schema.safeParse({ url: "https://ok" }).success).toBe(true);
  });
});
