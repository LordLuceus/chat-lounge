import type { SelectItem } from "$lib/types/client";
import { persisted } from "svelte-persisted-store";

export const selectedVoice = persisted<SelectItem | undefined>("selectedVoice", undefined);
