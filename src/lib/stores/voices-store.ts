import type { Voice } from "$lib/types/elevenlabs/voices";
import { writable } from "svelte/store";

export const voices = writable<Voice[] | null | undefined>(null);
