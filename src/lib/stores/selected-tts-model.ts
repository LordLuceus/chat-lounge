import type { TtsModelItem } from "$lib/types/client";
import { persisted } from "svelte-persisted-store";

export const selectedTtsModel = persisted<TtsModelItem | undefined>("selectedTtsModel", undefined);
