import type { ReasoningType } from "@prisma/client";

export interface SelectItem {
  label: string;
  value: string;
}

export interface TtsModelItem extends SelectItem {
  characterLimit: number;
}

export interface ModelSelectItem extends SelectItem {
  reasoningType: ReasoningType;
}
