import { writable } from "svelte/store";

export const ttsGenerating = writable<boolean>(false);
