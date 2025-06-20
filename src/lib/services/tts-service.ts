import { generateAudioFilename, ttsCleanup } from "$lib/helpers";
import { downloadUrl as downloadUrlStore, ttsGenerating } from "$lib/stores";
import { get } from "svelte/store";

interface TTSOptions {
  audioElement: HTMLAudioElement;
  text: string;
  voice?: string;
  modelId?: string;
  onDownloadReady: (downloadOptions: { downloadUrl: string; filename: string }) => void;
  onError: (error: string) => void;
  signal: AbortSignal;
}

export async function generateTTS({
  audioElement,
  text,
  voice,
  modelId,
  onDownloadReady,
  onError,
  signal
}: TTSOptions): Promise<void> {
  text = ttsCleanup(text);
  ttsGenerating.set(true);

  if (audioElement.src.startsWith("blob:")) {
    URL.revokeObjectURL(audioElement.src);
  }

  const isStreamingSupported = window.MediaSource && MediaSource.isTypeSupported("audio/mpeg");
  if (!isStreamingSupported) {
    console.warn("MediaSource API not supported. Falling back to full download for playback.");
    try {
      const response = await fetch(`/api/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice, stream: false, modelId }),
        signal
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch audio");
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      audioElement.src = audioUrl;
      audioElement.play();
      onDownloadReady({ downloadUrl: audioUrl, filename: generateAudioFilename(text) });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      onError(error.message);
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
      URL.revokeObjectURL(audioElement.src);

      const allChunks: Uint8Array[] = [];
      const chunkQueue: Uint8Array[] = [];
      let isStreamFinished = false;

      const sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");
      const MAX_BUFFER_AHEAD = 600; // 10 minutes

      let hasEncounteredError = false;
      const cleanup = () => {
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleError = (message: string, error?: any) => {
        if (hasEncounteredError) return;
        hasEncounteredError = true;
        console.error(message, error);
        onError(message);
        cleanup();
        ttsGenerating.set(false);
      };

      const pump = () => {
        if (hasEncounteredError) {
          return;
        }

        if (isStreamFinished && chunkQueue.length === 0) {
          if (!sourceBuffer.updating) {
            cleanup();
          }
          return;
        }

        if (sourceBuffer.buffered.length > 0) {
          const bufferEnd = sourceBuffer.buffered.end(sourceBuffer.buffered.length - 1);
          const bufferAhead = bufferEnd - audioElement.currentTime;
          if (bufferAhead > MAX_BUFFER_AHEAD) {
            return;
          }
        }

        if (sourceBuffer.updating || chunkQueue.length === 0) {
          return;
        }

        try {
          const chunk = chunkQueue.shift();
          if (chunk) {
            sourceBuffer.appendBuffer(chunk);
          }
        } catch (err) {
          handleError("Error appending to media buffer. Playback may be incomplete.", err);
        }
      };
      const onPlayBackEnded = () => {
        audioElement.removeEventListener("ended", onPlayBackEnded);
        if (audioElement.src === get(downloadUrlStore)) return;
        cleanup();

        URL.revokeObjectURL(audioElement.src);
        audioElement.src = get(downloadUrlStore);
        audioElement.pause();
      };

      const onSeeked = () => {
        if (hasEncounteredError) return;

        if (isStreamFinished && get(downloadUrlStore)) {
          cleanup();
          const currentTime = audioElement.currentTime;
          URL.revokeObjectURL(audioElement.src);
          audioElement.src = get(downloadUrlStore);
          audioElement.currentTime = currentTime;
          audioElement.play().catch((e) => console.warn("Autoplay was blocked:", e));
          audioElement.removeEventListener("seeked", onSeeked);
        }
      };

      sourceBuffer.addEventListener("updateend", pump);
      audioElement.addEventListener("timeupdate", pump);
      audioElement.addEventListener("ended", onPlayBackEnded);
      audioElement.addEventListener("seeked", onSeeked);

      const fetchAndQueueStream = async () => {
        try {
          const response = await fetch(`/api/tts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, voice, stream: true, modelId }),
            signal
          });

          if (!response.ok || !response.body) {
            const error = await response
              .json()
              .catch(() => ({ message: "An unknown network error occurred." }));
            throw new Error(error.message);
          }

          const reader = response.body.getReader();
          audioElement.play().catch((e) => console.warn("Autoplay was blocked:", e));

          // eslint-disable-next-line no-constant-condition
          while (true) {
            if (hasEncounteredError) break;
            const { done, value } = await reader.read();
            if (done) {
              break;
            }
            allChunks.push(value);
            chunkQueue.push(value);

            pump();
          }

          isStreamFinished = true;
          ttsGenerating.set(false);
          const audioBlob = new Blob(allChunks, { type: "audio/mpeg" });
          const downloadUrl = URL.createObjectURL(audioBlob);
          downloadUrlStore.set(downloadUrl);
          onDownloadReady({ downloadUrl, filename: generateAudioFilename(text) });

          pump();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
          if (err.name !== "AbortError") {
            handleError(err.message, err);
          }
        }
      };

      fetchAndQueueStream();
    },
    { once: true }
  );
}
