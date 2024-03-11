import { writable } from "svelte/store";

export const playingAudio = writable<HTMLAudioElement | null>(null);
