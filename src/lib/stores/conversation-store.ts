import type { ConversationWithMessageMap } from "$lib/server/conversations-service";
import { writable } from "svelte/store";

export const conversationStore = writable<ConversationWithMessageMap | null | undefined>(null);
