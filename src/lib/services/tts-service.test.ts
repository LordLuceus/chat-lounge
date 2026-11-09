// @vitest-environment jsdom
import { downloadUrl as downloadUrlStore, ttsGenerating } from "$lib/stores";
import { get } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateTTS } from "./tts-service";

// The service drives browser media APIs that jsdom does not implement:
// MediaSource/SourceBuffer, object URLs and media playback. Each gets a small
// hand-driven stand-in so the tests can step through the streaming pipeline.

class FakeSourceBuffer extends EventTarget {
  updating = false;
  appended: Uint8Array[] = [];
  bufferedEnd: number | null = null;
  appendError: Error | null = null;

  get buffered() {
    const end = this.bufferedEnd;
    return {
      length: end === null ? 0 : 1,
      end: () => end ?? 0
    };
  }

  appendBuffer(chunk: Uint8Array) {
    if (this.appendError) throw this.appendError;
    this.appended.push(chunk);
    this.updating = true;
  }

  // Simulates the browser finishing the append and firing `updateend`.
  finishUpdate() {
    this.updating = false;
    this.dispatchEvent(new Event("updateend"));
  }
}

class FakeMediaSource extends EventTarget {
  static instances: FakeMediaSource[] = [];
  static isTypeSupported = vi.fn(() => true);

  readyState: "closed" | "open" | "ended" = "closed";
  sourceBuffer = new FakeSourceBuffer();
  addSourceBuffer = vi.fn(() => this.sourceBuffer);
  endOfStream = vi.fn(() => {
    this.readyState = "ended";
  });

  constructor() {
    super();
    FakeMediaSource.instances.push(this);
  }

  // The browser fires `sourceopen` once the element has attached the source.
  open() {
    this.readyState = "open";
    this.dispatchEvent(new Event("sourceopen"));
  }

  static get latest() {
    return FakeMediaSource.instances[FakeMediaSource.instances.length - 1];
  }
}

class FakeAudioElement extends EventTarget {
  src = "";
  currentTime = 0;
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn();
}

interface FetchCall {
  url: string;
  body: Record<string, unknown>;
  signal: AbortSignal | null | undefined;
}

// A controllable `/api/tts`: each call is answered by hand with either a
// streaming body (chunks pushed through `push`/`close`) or a full Response.
function installFetch() {
  const calls: FetchCall[] = [];
  const pending: Array<(response: Response) => void> = [];
  const fetchMock = vi.fn((url: string, init: RequestInit) => {
    calls.push({
      url,
      body: JSON.parse(init.body as string),
      signal: init.signal
    });
    return new Promise<Response>((resolve, reject) => {
      if (init.signal?.aborted) {
        reject(new DOMException("The operation was aborted.", "AbortError"));
        return;
      }
      pending.push(resolve);
    });
  });
  vi.stubGlobal("fetch", fetchMock);

  const respondWithStream = () => {
    let controller!: ReadableStreamDefaultController<Uint8Array>;
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        controller = c;
      }
    });
    const call = calls[calls.length - 1];
    call.signal?.addEventListener("abort", () => {
      try {
        controller.error(new DOMException("The operation was aborted.", "AbortError"));
      } catch {
        // already closed
      }
    });
    pending.shift()!(new Response(stream, { status: 200 }));
    return {
      push: (chunk: Uint8Array) => controller.enqueue(chunk),
      close: () => controller.close()
    };
  };

  const respondWith = (response: Response) => pending.shift()!(response);

  return { calls, fetchMock, respondWithStream, respondWith };
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function installObjectUrls() {
  let counter = 0;
  const created: unknown[] = [];
  const createObjectURL = vi.fn((object: unknown) => {
    created.push(object);
    return `blob:test/${++counter}`;
  });
  const revokeObjectURL = vi.fn();
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
  return { created, createObjectURL, revokeObjectURL };
}

function installMediaSource(supported: boolean) {
  FakeMediaSource.instances = [];
  FakeMediaSource.isTypeSupported.mockReturnValue(supported);
  for (const target of [window, globalThis]) {
    Object.defineProperty(target, "MediaSource", {
      configurable: true,
      writable: true,
      value: supported ? FakeMediaSource : undefined
    });
  }
}

function start(
  audioElement: FakeAudioElement,
  overrides: Partial<Parameters<typeof generateTTS>[0]> = {}
) {
  const controller = new AbortController();
  const onDownloadReady = vi.fn();
  const onError = vi.fn();
  const promise = generateTTS({
    audioElement: audioElement as unknown as HTMLAudioElement,
    text: "Hello **world**",
    voice: "voice-1",
    modelId: "eleven_turbo_v2",
    onDownloadReady,
    onError,
    signal: controller.signal,
    ...overrides
  });
  return { promise, controller, onDownloadReady, onError };
}

describe("generateTTS", () => {
  let fetchApi: ReturnType<typeof installFetch>;
  let urls: ReturnType<typeof installObjectUrls>;
  let audio: FakeAudioElement;

  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchApi = installFetch();
    urls = installObjectUrls();
    audio = new FakeAudioElement();
    ttsGenerating.set(false);
    downloadUrlStore.set("");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("streaming playback", () => {
    beforeEach(() => installMediaSource(true));

    // Runs the service up to the point where the server has started streaming.
    async function startStreaming(overrides: Parameters<typeof start>[1] = {}) {
      const run = start(audio, overrides);
      const mediaSource = FakeMediaSource.latest;
      mediaSource.open();
      const stream = fetchApi.respondWithStream();
      await flush();
      return { ...run, mediaSource, sourceBuffer: mediaSource.sourceBuffer, stream };
    }

    it("marks generation as in progress and attaches a MediaSource to the element", () => {
      audio.src = "blob:test/old";
      start(audio);

      expect(get(ttsGenerating)).toBe(true);
      expect(urls.revokeObjectURL).toHaveBeenCalledWith("blob:test/old");
      expect(urls.createObjectURL).toHaveBeenCalledWith(FakeMediaSource.latest);
      expect(audio.src).toBe("blob:test/1");
      expect(fetchApi.fetchMock).not.toHaveBeenCalled();
    });

    it("requests a stream of the cleaned-up text once the source opens", async () => {
      const { mediaSource } = await startStreaming({
        text: "Read [this](https://example.com) and `that`\n```js\nignored();\n```"
      });

      expect(mediaSource.addSourceBuffer).toHaveBeenCalledWith("audio/mpeg");
      expect(urls.revokeObjectURL).toHaveBeenCalledWith("blob:test/1");
      expect(fetchApi.calls).toHaveLength(1);
      expect(fetchApi.calls[0].url).toBe("/api/tts");
      expect(fetchApi.calls[0].body).toEqual({
        text: "Read this and that\n",
        voice: "voice-1",
        modelId: "eleven_turbo_v2",
        stream: true
      });
      expect(audio.play).toHaveBeenCalledTimes(1);
    });

    it("appends chunks one at a time, waiting for each append to finish", async () => {
      const { sourceBuffer, stream } = await startStreaming();

      stream.push(new Uint8Array([1]));
      stream.push(new Uint8Array([2]));
      await flush();
      expect(sourceBuffer.appended.map((c) => Array.from(c))).toEqual([[1]]);

      sourceBuffer.finishUpdate();
      expect(sourceBuffer.appended.map((c) => Array.from(c))).toEqual([[1], [2]]);
    });

    it("ends the stream and reports the download once everything is appended", async () => {
      const { sourceBuffer, stream, mediaSource, onDownloadReady, onError } =
        await startStreaming();

      stream.push(new Uint8Array([1, 2]));
      stream.push(new Uint8Array([3]));
      await flush();
      stream.close();
      await flush();

      expect(get(ttsGenerating)).toBe(false);
      expect(onDownloadReady).toHaveBeenCalledWith({
        downloadUrl: "blob:test/2",
        filename: "Hello world.mp3"
      });
      const blob = urls.created[1] as Blob;
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe("audio/mpeg");
      expect(blob.size).toBe(3);
      // The last chunk is still queued, so the source is not ended yet.
      expect(mediaSource.endOfStream).not.toHaveBeenCalled();

      sourceBuffer.finishUpdate();
      expect(sourceBuffer.appended).toHaveLength(2);
      sourceBuffer.finishUpdate();
      expect(mediaSource.endOfStream).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();
    });

    it("stops appending while more than ten minutes are buffered ahead", async () => {
      const { sourceBuffer, stream } = await startStreaming();

      stream.push(new Uint8Array([1]));
      await flush();
      sourceBuffer.bufferedEnd = 700;
      audio.currentTime = 10;
      sourceBuffer.finishUpdate();
      stream.push(new Uint8Array([2]));
      await flush();
      expect(sourceBuffer.appended).toHaveLength(1);

      // Playback catches up and the next timeupdate resumes the pump.
      audio.currentTime = 200;
      audio.dispatchEvent(new Event("timeupdate"));
      expect(sourceBuffer.appended).toHaveLength(2);
    });

    async function finishStream(run: Awaited<ReturnType<typeof startStreaming>>) {
      run.stream.push(new Uint8Array([1]));
      await flush();
      run.stream.close();
      await flush();
      run.sourceBuffer.finishUpdate();
      downloadUrlStore.set(run.onDownloadReady.mock.calls[0][0].downloadUrl);
    }

    it("switches to the downloadable file when playback ends", async () => {
      const run = await startStreaming();
      await finishStream(run);

      audio.dispatchEvent(new Event("ended"));

      expect(audio.src).toBe("blob:test/2");
      expect(audio.pause).toHaveBeenCalled();
      expect(urls.revokeObjectURL).toHaveBeenCalledWith("blob:test/1");
    });

    it("switches to the downloadable file on seek once the stream is complete", async () => {
      const run = await startStreaming();
      await finishStream(run);
      audio.currentTime = 42;

      audio.dispatchEvent(new Event("seeked"));

      expect(audio.src).toBe("blob:test/2");
      expect(audio.currentTime).toBe(42);
      expect(audio.play).toHaveBeenCalledTimes(2);
    });

    it("ignores seeks while the stream is still arriving", async () => {
      const run = await startStreaming();
      run.stream.push(new Uint8Array([1]));
      await flush();

      audio.dispatchEvent(new Event("seeked"));

      expect(audio.src).toBe("blob:test/1");
      expect(audio.play).toHaveBeenCalledTimes(1);
    });

    it("reports the server's error message and ends the stream", async () => {
      const run = start(audio);
      FakeMediaSource.latest.open();
      fetchApi.respondWith(
        new Response(JSON.stringify({ message: "API key not found" }), { status: 404 })
      );
      await flush();

      expect(run.onError).toHaveBeenCalledWith("API key not found");
      expect(run.onDownloadReady).not.toHaveBeenCalled();
      expect(get(ttsGenerating)).toBe(false);
      expect(FakeMediaSource.latest.endOfStream).toHaveBeenCalledTimes(1);
    });

    it("reports a failed append once and stops feeding the buffer", async () => {
      const { sourceBuffer, stream, onError, mediaSource } = await startStreaming();
      sourceBuffer.appendError = new DOMException("QuotaExceededError", "QuotaExceededError");

      stream.push(new Uint8Array([1]));
      stream.push(new Uint8Array([2]));
      await flush();

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        "Error appending to media buffer. Playback may be incomplete."
      );
      expect(mediaSource.endOfStream).toHaveBeenCalledTimes(1);
      expect(get(ttsGenerating)).toBe(false);
    });
  });

  describe("without MediaSource support", () => {
    beforeEach(() => installMediaSource(false));

    it("downloads the whole file, plays it and offers it for download", async () => {
      const run = start(audio);
      expect(get(ttsGenerating)).toBe(true);
      expect(fetchApi.calls[0].body).toMatchObject({ stream: false, text: "Hello world" });

      fetchApi.respondWith(
        new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { "Content-Type": "audio/mpeg" }
        })
      );
      await run.promise;

      expect(audio.src).toBe("blob:test/1");
      expect(audio.play).toHaveBeenCalledTimes(1);
      expect(run.onDownloadReady).toHaveBeenCalledWith({
        downloadUrl: "blob:test/1",
        filename: "Hello world.mp3"
      });
      expect(get(ttsGenerating)).toBe(false);
      expect(run.onError).not.toHaveBeenCalled();
    });

    it("reports the server's error message", async () => {
      const run = start(audio);
      fetchApi.respondWith(
        new Response(JSON.stringify({ message: "No voice provided" }), { status: 400 })
      );
      await run.promise;

      expect(run.onError).toHaveBeenCalledWith("No voice provided");
      expect(run.onDownloadReady).not.toHaveBeenCalled();
      expect(get(ttsGenerating)).toBe(false);
    });
  });
});
