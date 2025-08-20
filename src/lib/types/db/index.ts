import type { UIMessage } from "ai";

export enum AIProvider {
  Mistral = "mistral",
  OpenAI = "openai",
  ElevenLabs = "elevenlabs",
  Google = "google",
  Anthropic = "anthropic",
  XAI = "xai",
  OpenRouter = "openrouter"
}

export enum Visibility {
  Public = "public",
  Private = "private",
  Hidden = "hidden"
}

export enum AgentType {
  Default = "default",
  Character = "character"
}

export enum AgentVerbosity {
  Concise = "concise",
  Default = "default",
  Verbose = "verbose"
}

export interface DBMessage extends UIMessage {
  parentId: string | null;
  childIds: string[];
  createdAt: Date;
  updatedAt: Date;
  modelId?: string | null;
  model?: { id: string; name: string } | null;
}
