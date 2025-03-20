import type {
  agents,
  apiKeys,
  conversations,
  folders,
  messages,
  models,
  sharedConversations,
  sharedMessages,
  users
} from "$lib/server/db";
import type { InferSelectModel } from "drizzle-orm";

export enum AIProvider {
  Mistral = "mistral",
  OpenAI = "openai",
  ElevenLabs = "elevenlabs",
  Google = "google",
  Anthropic = "anthropic"
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

export type Conversation = InferSelectModel<typeof conversations>;
export type ConversationWithMessages = Conversation & {
  messages: Array<InferSelectModel<typeof messages> & { childIds?: string[] }>;
};

export type Model = InferSelectModel<typeof models>;

export type Agent = InferSelectModel<typeof agents>;

export type AgentWithUsage = Agent & {
  lastUsedAt: Date | null;
};

export type ApiKey = InferSelectModel<typeof apiKeys>;

export type User = InferSelectModel<typeof users>;

export type SharedConversation = InferSelectModel<typeof sharedConversations>;

export type SharedMessage = InferSelectModel<typeof sharedMessages>;

export type Folder = InferSelectModel<typeof folders>;
