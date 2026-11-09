import { generateAudioFilename, ttsCleanup } from "$lib/helpers";
import { ttsGenerating } from "$lib/stores";

interface TTSOptions {
  audioElement: HTMLAudioElement;
  text: string;
  voice?: string;
  modelId?: string;
  onDownloadReady: (downloadOptions: { downloadUrl: string; filename: string }) => void;
  onError: (error: string) => void;
  signal: AbortSignal;
}

interface TTSRequest {
  text: string;
  voice?: string;
  modelId?: string;
  stream: boolean;
}

/** Stop feeding the source buffer once this much audio is buffered past the playhead. */
const MAX_BUFFER_AHEAD_SECONDS = 600;

// Generations share one audio element, so the previous generation's listeners
// and object URLs are released before a new one starts. The download URL handed
// to `onDownloadReady` is therefore valid until the next call to `generateTTS`.
let teardownPrevious: (() => void) | null = null;

/**
 * Speaks `text` through `audioElement` using the `/api/tts` endpoint.
 *
 * When the browser supports the MediaSource API the audio is streamed and
 * played as it arrives; once the stream is complete the full file is offered
 * for download and used for seeking. Otherwise the whole file is fetched
 * before playback starts.
 */
export async function generateTTS({
  audioElement,
  text,
  voice,
  modelId,
  onDownloadReady,
  onError,
  signal
}: TTSOptions): Promise<void> {
  teardownPrevious?.();
  teardownPrevious = null;

  text = ttsCleanup(text);
  ttsGenerating.set(true);
  revokeObjectUrl(audioElement.src);

  const request: TTSRequest = { text, voice, modelId, stream: false };
  const filename = generateAudioFilename(text);

  if (!isStreamingSupported()) {
    console.warn("MediaSource API not supported. Falling back to full download for playback.");
    try {
      const response = await requestAudio(request, signal);
      const downloadUrl = URL.createObjectURL(await response.blob());
      audioElement.src = downloadUrl;
      audioElement.play().catch(warnAutoplayBlocked);
      onDownloadReady({ downloadUrl, filename });
    } catch (err) {
      if (!isAbortError(err)) onError(errorMessage(err));
    } finally {
      ttsGenerating.set(false);
    }
    return;
  }

  const mediaSource = new MediaSource();
  audioElement.src = URL.createObjectURL(mediaSource);

  mediaSource.addEventListener(
    "sourceopen",
    () => {
      // The element holds its own reference to the MediaSource once attached.
      URL.revokeObjectURL(audioElement.src);

      const sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");
      const allChunks: Uint8Array<ArrayBuffer>[] = [];
      const chunkQueue: Uint8Array<ArrayBuffer>[] = [];
      let reader: ReadableStreamDefaultReader<Uint8Array<ArrayBuffer>> | null = null;
      let isStreamFinished = false;
      let downloadUrl: string | null = null;
      let hasFailed = false;
      let isTornDown = false;

      // Stops feeding the buffer and closes the stream; playback of what has
      // already been buffered continues.
      const finishStream = () => {
        audioElement.removeEventListener("timeupdate", pump);
        sourceBuffer.removeEventListener("updateend", pump);
        if (mediaSource.readyState === "open") {
          try {
            mediaSource.endOfStream();
          } catch (e) {
            console.warn("MediaSource already closed or ended.", e);
          }
        }
      };

      // Releases everything this generation attached to the shared element.
      const teardown = () => {
        if (isTornDown) return;
        isTornDown = true;
        finishStream();
        audioElement.removeEventListener("ended", onPlaybackEnded);
        audioElement.removeEventListener("seeked", onSeeked);
        reader?.cancel().catch(() => {});
        if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      };
      teardownPrevious = teardown;

      const fail = (message: string, error?: unknown) => {
        if (hasFailed || isTornDown) return;
        hasFailed = true;
        console.error(message, error);
        onError(message);
        finishStream();
        ttsGenerating.set(false);
      };

      const pump = () => {
        if (hasFailed || isTornDown) return;

        if (isStreamFinished && chunkQueue.length === 0) {
          if (!sourceBuffer.updating) finishStream();
          return;
        }

        if (sourceBuffer.buffered.length > 0) {
          const bufferEnd = sourceBuffer.buffered.end(sourceBuffer.buffered.length - 1);
          if (bufferEnd - audioElement.currentTime > MAX_BUFFER_AHEAD_SECONDS) return;
        }

        if (sourceBuffer.updating || chunkQueue.length === 0) return;

        try {
          sourceBuffer.appendBuffer(chunkQueue.shift()!);
        } catch (err) {
          fail("Error appending to media buffer. Playback may be incomplete.", err);
        }
      };

      // Swaps the element over to the complete file so the native controls
      // can replay and seek freely without the MediaSource.
      const switchToDownload = (resume: boolean) => {
        if (!downloadUrl || audioElement.src === downloadUrl) return;
        finishStream();
        const currentTime = audioElement.currentTime;
        revokeObjectUrl(audioElement.src);
        audioElement.src = downloadUrl;
        if (resume) {
          audioElement.currentTime = currentTime;
          audioElement.play().catch(warnAutoplayBlocked);
        } else {
          audioElement.pause();
        }
      };

      const onPlaybackEnded = () => {
        audioElement.removeEventListener("ended", onPlaybackEnded);
        switchToDownload(false);
      };

      const onSeeked = () => {
        if (hasFailed || !isStreamFinished || !downloadUrl) return;
        audioElement.removeEventListener("seeked", onSeeked);
        switchToDownload(true);
      };

      sourceBuffer.addEventListener("updateend", pump);
      audioElement.addEventListener("timeupdate", pump);
      audioElement.addEventListener("ended", onPlaybackEnded);
      audioElement.addEventListener("seeked", onSeeked);

      const streamAudio = async () => {
        try {
          const response = await requestAudio({ ...request, stream: true }, signal);
          if (!response.body) throw new Error("The server returned no audio.");

          reader = response.body.getReader();
          audioElement.play().catch(warnAutoplayBlocked);

          while (!hasFailed && !isTornDown) {
            const { done, value } = await reader.read();
            if (done) break;
            allChunks.push(value);
            chunkQueue.push(value);
            pump();
          }
          if (isTornDown) return;

          isStreamFinished = true;
          ttsGenerating.set(false);
          downloadUrl = URL.createObjectURL(new Blob(allChunks, { type: "audio/mpeg" }));
          onDownloadReady({ downloadUrl, filename });
          pump();
        } catch (err) {
          if (isTornDown) return;
          if (isAbortError(err)) {
            // The caller cancelled; nothing more will arrive, so release the element.
            teardown();
            ttsGenerating.set(false);
            return;
          }
          fail(errorMessage(err), err);
        }
      };

      streamAudio();
    },
    { once: true }
  );
}

function isStreamingSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.MediaSource !== "undefined" &&
    window.MediaSource.isTypeSupported("audio/mpeg")
  );
}

async function requestAudio(request: TTSRequest, signal: AbortSignal): Promise<Response> {
  const response = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal
  });

  if (!response.ok) {
    const details: { message?: string } | null = await response.json().catch(() => null);
    throw new Error(details?.message || "Failed to fetch audio");
  }

  return response;
}

function revokeObjectUrl(url: string) {
  if (url.startsWith("blob:")) URL.revokeObjectURL(url);
}

// Checked by name rather than `instanceof` because DOMException comes from the
// browser realm and may not share the page's Error prototype.
function isAbortError(err: unknown): boolean {
  return (
    typeof err === "object" && err !== null && (err as { name?: unknown }).name === "AbortError"
  );
}

function errorMessage(err: unknown): string {
  const message = typeof err === "object" && err !== null && (err as { message?: unknown }).message;
  return typeof message === "string" && message ? message : "Failed to fetch audio";
}

function warnAutoplayBlocked(err: unknown) {
  console.warn("Autoplay was blocked:", err);
}
