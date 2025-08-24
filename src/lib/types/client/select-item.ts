export interface SelectItem {
  label: string;
  value: string;
}

export interface TtsModelItem extends SelectItem {
  characterLimit: number;
}

export interface ModelSelectItem extends SelectItem {
  thinkingAvailable?: boolean;
}
