import { writable } from "svelte/store";

export const audioFilename = writable<string>("");
export const currentAudioUrl = writable<string | null>(null);
export const downloadUrl = writable<string>("");
export const playingAudio = writable<HTMLAudioElement | null>(null);
