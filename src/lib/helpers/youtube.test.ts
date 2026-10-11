import { afterEach, describe, expect, it, vi } from "vitest";
import { extractYouTubeUrls, fetchYouTubeTitle, getYouTubeVideoId, isYouTubeUrl } from "./youtube";

describe("extractYouTubeUrls", () => {
  it("finds watch and short links as written", () => {
    expect(
      extractYouTubeUrls(
        "see https://www.youtube.com/watch?v=abc-123 and https://youtu.be/XYZ_9?t=10 thanks"
      )
    ).toEqual(["https://www.youtube.com/watch?v=abc-123", "https://youtu.be/XYZ_9?t=10"]);
  });

  it("normalises shorts, live, embed, mobile and http links", () => {
    expect(
      extractYouTubeUrls(
        [
          "https://youtube.com/shorts/s1",
          "https://www.youtube.com/live/l1?feature=share",
          "https://www.youtube.com/embed/e1",
          "https://m.youtube.com/watch?v=m1",
          "http://www.youtube.com/watch?v=h1"
        ].join(" ")
      )
    ).toEqual([
      "https://www.youtube.com/watch?v=s1",
      "https://www.youtube.com/watch?v=l1",
      "https://www.youtube.com/watch?v=e1",
      "https://www.youtube.com/watch?v=m1",
      "https://www.youtube.com/watch?v=h1"
    ]);
  });

  it("de-duplicates and ignores other links", () => {
    expect(
      extractYouTubeUrls("https://youtu.be/dup https://youtu.be/dup https://vimeo.com/1")
    ).toEqual(["https://youtu.be/dup"]);
    expect(extractYouTubeUrls("nothing here")).toEqual([]);
  });
});

describe("getYouTubeVideoId", () => {
  it("reads the id from both URL forms", () => {
    expect(getYouTubeVideoId("https://www.youtube.com/watch?v=abc_1-2&t=4")).toBe("abc_1-2");
    expect(getYouTubeVideoId("https://youtu.be/xyz")).toBe("xyz");
  });

  it("returns null for other or malformed URLs", () => {
    expect(getYouTubeVideoId("https://www.youtube.com/shorts/abc")).toBeNull();
    expect(getYouTubeVideoId("https://www.youtube.com/watch?v=bad id")).toBeNull();
    expect(getYouTubeVideoId("not a url")).toBeNull();
  });
});

describe("isYouTubeUrl", () => {
  it("accepts only the forms Gemini takes directly", () => {
    expect(isYouTubeUrl("https://www.youtube.com/watch?v=a")).toBe(true);
    expect(isYouTubeUrl("https://youtube.com/watch?v=a")).toBe(true);
    expect(isYouTubeUrl("https://youtu.be/a")).toBe(true);
    expect(isYouTubeUrl("http://www.youtube.com/watch?v=a")).toBe(false);
    expect(isYouTubeUrl("https://www.youtube.com/shorts/a")).toBe(false);
  });
});

describe("fetchYouTubeTitle", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads the title from oEmbed and caches it per video", async () => {
    const fetchMock = vi.fn<(url: string) => Promise<Response>>(async () =>
      Response.json({ title: "  A title " })
    );
    vi.stubGlobal("fetch", fetchMock);

    expect(await fetchYouTubeTitle("cached-1")).toBe("A title");
    expect(await fetchYouTubeTitle("cached-1")).toBe("A title");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      encodeURIComponent("https://www.youtube.com/watch?v=cached-1")
    );
  });

  it("resolves to null when the lookup fails or has no title", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 404 }))
    );
    expect(await fetchYouTubeTitle("missing-1")).toBeNull();

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({}))
    );
    expect(await fetchYouTubeTitle("untitled-1")).toBeNull();

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new Error("offline")))
    );
    expect(await fetchYouTubeTitle("offline-1")).toBeNull();
  });
});
