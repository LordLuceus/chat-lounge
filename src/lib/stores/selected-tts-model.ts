import type { SelectItem } from "$lib/types/client";
import { persisted } from "svelte-persisted-store";

export const selectedTtsModel = persisted<SelectItem | undefined>("selectedTtsModel", undefined);
