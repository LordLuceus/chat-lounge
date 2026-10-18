import { cleanup, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import MessageContent from "./MessageContent.svelte";

describe("MessageContent", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders markdown text", () => {
    render(MessageContent, {
      message: {
        role: "assistant",
        parts: [{ type: "text", text: "Some **bold** text\n\n- item" }]
      }
    });
    expect(screen.getByText("bold").tagName).toBe("STRONG");
    expect(screen.getByRole("listitem")).toHaveTextContent("item");
    expect(screen.getByLabelText("assistant message")).toBeInTheDocument();
  });

  it("renders LaTeX with KaTeX", () => {
    render(MessageContent, {
      message: {
        role: "assistant",
        parts: [
          {
            type: "text",
            text: "Euler: \\(e^{i\\pi} + 1 = 0\\)\n\n\\[\n\\int_0^1 x\\,dx\n\\]\n\nCosts $5 and $10."
          }
        ]
      }
    });
    const math = document.querySelectorAll(".katex");
    expect(math).toHaveLength(2);
    expect(math[0].querySelector("annotation")).toHaveTextContent("e^{i\\pi} + 1 = 0");
    expect(document.querySelectorAll(".katex-display")).toHaveLength(1);
    expect(screen.getByText("Costs $5 and $10.")).toBeInTheDocument();
    expect(document.querySelector("pre")).toBeNull();
  });

  it("renders inline $$ as display maths and leaves code alone", () => {
    render(MessageContent, {
      message: {
        role: "assistant",
        parts: [{ type: "text", text: "So $$a = b$$ here, and `$x$` in code:\n\n```\n$y$\n```" }]
      }
    });
    expect(document.querySelectorAll(".katex-display")).toHaveLength(1);
    expect(document.querySelectorAll(".katex")).toHaveLength(1);
    expect(screen.getByText("$x$").tagName).toBe("CODE");
    expect(document.querySelector("pre code")).toHaveTextContent("$y$");
  });

  it("shows images with direct URLs and video attachments", () => {
    render(MessageContent, {
      message: {
        role: "user",
        parts: [
          {
            type: "file",
            url: "https://signed/cat.png",
            mediaType: "image/png",
            filename: "cat.png"
          },
          {
            type: "file",
            url: "https://signed/clip.mp4",
            mediaType: "video/mp4",
            filename: "clip.mp4"
          }
        ]
      },
      user: { username: "tester" }
    });
    expect(screen.getByAltText("cat.png")).toHaveAttribute("src", "https://signed/cat.png");
    expect(screen.getByText("Video attachment: clip.mp4")).toBeInTheDocument();
  });

  it("fetches presigned URLs for stored files and generated images", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const { key } = JSON.parse(String(init?.body));
      return Response.json({ url: `https://signed/${key}` });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(MessageContent, {
      message: {
        role: "assistant",
        parts: [
          {
            type: "file",
            key: "u/stored.png",
            mediaType: "image/png",
            filename: "stored.png"
          } as never,
          {
            type: "tool-generateImage",
            toolCallId: "c1",
            state: "output-available",
            input: { prompt: "a lighthouse" },
            output: { success: true, key: "u/gen.png", mediaType: "image/png", filename: "gen.png" }
          } as never
        ]
      }
    });

    await waitFor(() =>
      expect(screen.getByAltText("stored.png")).toHaveAttribute(
        "src",
        "https://signed/u/stored.png"
      )
    );
    expect(screen.getByAltText("Generated image: a lighthouse")).toHaveAttribute(
      "src",
      "https://signed/u/gen.png"
    );
    expect(screen.getByRole("button", { name: /Download image/ })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("embeds YouTube video inputs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ title: "Rocket launch" }))
    );
    render(MessageContent, {
      message: {
        role: "user",
        parts: [
          { type: "file", url: "https://www.youtube.com/watch?v=abc123", mediaType: "video/mp4" }
        ]
      }
    });
    const frame = document.querySelector("iframe")!;
    expect(frame).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/abc123");
    await waitFor(() => expect(frame).toHaveAttribute("title", "Rocket launch"));
    expect(
      screen.getByRole("link", { name: "https://www.youtube.com/watch?v=abc123" })
    ).toBeInTheDocument();
  });

  it("shows reasoning in a collapsible section", () => {
    render(MessageContent, {
      message: { role: "assistant", parts: [{ type: "reasoning", text: "Let me think" }] }
    });
    expect(screen.getByText("Reasoning").tagName).toBe("SUMMARY");
    expect(screen.getByText("Let me think")).toBeInTheDocument();
  });
});
