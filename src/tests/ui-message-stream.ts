import type { UIMessageChunk } from "ai";

/**
 * A hand-driven UI message stream response, in the SSE format
 * `DefaultChatTransport` reads. The test pushes chunks one at a time, so it
 * can act between them exactly as a user would while a reply is generating.
 */
export function createUIMessageStream() {
  const encoder = new TextEncoder();
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    }
  });

  return {
    response: new Response(body, {
      status: 200,
      headers: {
        "content-type": "text/event-stream",
        "x-vercel-ai-ui-message-stream": "v1"
      }
    }),
    push(chunk: UIMessageChunk) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
    },
    close() {
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    }
  };
}

/** Waits for pending microtasks and a macrotask, letting streams and effects settle. */
export function flush() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}
