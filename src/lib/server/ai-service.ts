import { addConversationMessage } from "$lib/server/conversations-service";
import MistralClient from "@mistralai/mistralai";
import { MistralStream, OpenAIStream, StreamingTextResponse } from "ai";
import { OpenAI } from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/index.mjs";

interface Message {
  role: string;
  content: string;
}

interface AIProvider {
  getResponse(
    messages: Message[],
    modelId: string,
    onCompletion: (completion: string) => void
  ): Promise<unknown>;
}

class MistralHandler implements AIProvider {
  constructor(private apiKey: string) {}

  async getResponse(
    messages: Message[],
    modelId: string,
    onCompletion: (completion: string) => void
  ) {
    const client = new MistralClient(this.apiKey);

    const response = await client.chatStream({ messages, model: modelId, temperature: 1.0 });

    return MistralStream(response, { onCompletion });
  }
}

class OpenAIHandler implements AIProvider {
  constructor(private apiKey: string) {}

  async getResponse(
    messages: Message[],
    modelId: string,
    onCompletion: (completion: string) => void
  ) {
    const client = new OpenAI({ apiKey: this.apiKey });
    const response = await client.chat.completions.create({
      messages: messages as ChatCompletionMessageParam[],
      model: modelId,
      temperature: 1.0,
      stream: true
    });

    return OpenAIStream(response, { onCompletion });
  }
}

class AIService {
  private handler: AIProvider;

  constructor(provider: string, apiKey: string) {
    if (provider === "mistral") {
      this.handler = new MistralHandler(apiKey);
    } else if (provider === "openai") {
      this.handler = new OpenAIHandler(apiKey);
    } else {
      throw new Error("Unsupported AI provider");
    }
  }

  async getResponse(
    messages: Message[],
    modelId: string,
    userId: string,
    agent?: { id: string; instructions: string },
    conversationId?: string,
    regenerate?: boolean
  ) {
    if (agent) {
      messages.unshift({ role: "system", content: agent.instructions });
    }

    const onCompletion = async (completion: string) => {
      if (conversationId) {
        if (!regenerate) {
          await addConversationMessage(
            conversationId,
            messages.at(-1)?.content as string,
            "user",
            userId
          );
        }
        await addConversationMessage(conversationId, completion, "assistant");
      }
    };

    const stream = await this.handler.getResponse(messages, modelId, onCompletion);

    return new StreamingTextResponse(stream as ReadableStream);
  }
}

export default AIService;
