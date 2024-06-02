import { writable } from "svelte/store";

export interface TTSProps {
  text: string;
  voice?: string;
  signal: AbortSignal;
}

export const ttsProps = writable<TTSProps | null>(null);
