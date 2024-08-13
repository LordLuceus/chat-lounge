export interface SelectItem {
  label: string;
  value: string;
}

export type TtsModelItem = SelectItem & { characterLimit: number };
