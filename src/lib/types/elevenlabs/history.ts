export interface HistoryResponse {
  history: History[];
  last_history_item_id: string;
  has_more: boolean;
}

export interface History {
  history_item_id: string;
  request_id: string;
  voice_id: string;
  model_id: ModelID;
  voice_name: string;
  voice_category: VoiceCategory;
  text: string;
  date_unix: number;
  character_count_change_from: number;
  character_count_change_to: number;
  content_type: ContentType;
  state: State;
  settings: Settings;
  feedback: null;
  share_link_id: null;
  source: Source;
}

export enum ContentType {
  AudioMPEG = "audio/mpeg"
}

export enum ModelID {
  ElevenEnglishStsV2 = "eleven_english_sts_v2",
  ElevenEnglishV2 = "eleven_english_v2",
  ElevenMultilingualV2 = "eleven_multilingual_v2",
  ElevenTurboV2 = "eleven_turbo_v2"
}

export interface Settings {
  similarity_boost: number;
  stability: number;
  style: number;
  use_speaker_boost: boolean;
}

export enum Source {
  Sts = "STS",
  TTS = "TTS"
}

export enum State {
  Created = "created"
}

export enum VoiceCategory {
  Cloned = "cloned",
  Generated = "generated",
  Premade = "premade"
}
