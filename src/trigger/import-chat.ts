import { importChat, type MessageImport } from "$lib/server/conversations-service";
import { task } from "@trigger.dev/sdk/v3";

interface Payload {
  userId: string;
  modelId: string;
  data: MessageImport[];
}

export const importChatTask = task({
  id: "import-chat",
  run: async (payload: Payload) => {
    const { userId, modelId, data } = payload;

    if (!userId || !modelId || !data) {
      throw new Error("Missing required parameters");
    }

    const conversation = await importChat(userId, modelId, data);

    if (!conversation) {
      throw new Error("Failed to import chat");
    }

    return {
      conversation
    };
  }
});
