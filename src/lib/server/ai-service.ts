import {
  addConversationMessage,
  getConversationMessage,
  getInternalMessages
} from "$lib/server/conversations-service";
import { getModel } from "$lib/server/models-service";
import MistralClient from "@mistralai/mistralai";
import { MistralStream, OpenAIStream, StreamingTextResponse } from "ai";
import type { ChatMessage } from "gpt-tokenizer/GptEncoding";
import { isWithinTokenLimit } from "gpt-tokenizer/model/gpt-4";
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

  generateSummary(messages: Message[], modelId: string): Promise<string>;

  isWithinLimit(messages: Message[], limit: number): boolean;
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

  async generateSummary(messages: Message[], modelId: string) {
    const client = new MistralClient(this.apiKey);
    const prompt =
      "Summarise this conversation. Keep it concise, but retain as much information as possible.";

    const response = await client.chat({
      messages: [...messages.slice(0, -1), { role: "user", content: prompt }],
      model: modelId,
      temperature: 0.5
    });

    return response.choices[0].message.content;
  }

  isWithinLimit(messages: Message[], limit: number): boolean {
    // Using the GPT tokenizer even for Mistral because there's no good mistral tokenizer available, this will do for now
    const isWithinLimit = isWithinTokenLimit(messages as ChatMessage[], limit);

    return !!isWithinLimit;
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

  async generateSummary(messages: Message[], modelId: string) {
    const client = new OpenAI({ apiKey: this.apiKey });
    const prompt =
      "Summarise this conversation. Keep it concise, but retain as much information as possible.";

    const response = await client.chat.completions.create({
      messages: [
        ...messages.slice(0, -1),
        { role: "user", content: prompt }
      ] as ChatCompletionMessageParam[],
      model: modelId,
      temperature: 0.5
    });

    return response.choices[0].message.content!;
  }

  isWithinLimit(messages: Message[], limit: number): boolean {
    const isWithinLimit = isWithinTokenLimit(messages as ChatMessage[], limit);

    return !!isWithinLimit;
  }
}

class AIService {
  private handler: AIProvider;
  private readonly LIMIT_MULTIPLIER = 0.9; // We use 90% of the token limit to give us some headroom

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
    regenerate?: boolean,
    messageId?: string
  ) {
    const model = await getModel(modelId);

    if (!model) {
      throw new Error("Model not found");
    }

    if (agent) {
      messages.unshift({ role: "system", content: agent.instructions });
    }

    const processedMessages = await this.ensureWithinLimit(
      messages,
      model,
      conversationId,
      userId,
      messageId
    );

    const onCompletion = async (completion: string) => {
      if (conversationId) {
        if (!regenerate) {
          await addConversationMessage(
            conversationId,
            messages.at(-1)?.content as string,
            "user",
            userId,
            messageId
          );
        }
        await addConversationMessage(conversationId, completion, "assistant");
      }
    };

    const stream = await this.handler.getResponse(processedMessages, modelId, onCompletion);

    return new StreamingTextResponse(stream as ReadableStream);
  }

  private async ensureWithinLimit(
    messages: Message[],
    model: {
      id: string;
      provider: string;
      tokenLimit: number;
    },
    conversationId: string | undefined,
    userId: string,
    messageId: string | undefined
  ) {
    let processedMessages = messages;
    if (!this.handler.isWithinLimit(messages, model.tokenLimit * this.LIMIT_MULTIPLIER)) {
      if (conversationId) {
        const internalMessages = await getInternalMessages(conversationId);

        if (internalMessages.length > 0) {
          const parentId = internalMessages.at(-1)?.parentId;
          if (parentId) {
            const parentMessage = await getConversationMessage(conversationId, parentId);
            if (parentMessage) {
              const index = messages.findLastIndex(
                (message) =>
                  message.content === parentMessage.content && message.role === parentMessage.role
              );
              if (index !== -1) {
                const summaries = internalMessages.map((message) => ({
                  role: message.role,
                  content: message.content
                }));
                processedMessages = [...summaries, ...messages.slice(index + 1)];

                if (
                  !this.handler.isWithinLimit(
                    processedMessages,
                    model.tokenLimit * this.LIMIT_MULTIPLIER
                  )
                ) {
                  const summary = await this.handler.generateSummary(processedMessages, model.id);
                  await addConversationMessage(
                    conversationId,
                    summary,
                    "user",
                    userId,
                    messageId,
                    true
                  );
                  processedMessages = [...summaries, { role: "user", content: summary }];
                  processedMessages.push(messages[messages.length - 1]);
                }
              }
            }
          }
        } else {
          const summary = await this.handler.generateSummary(messages, model.id);
          await addConversationMessage(conversationId, summary, "user", userId, messageId, true);
          processedMessages = [{ role: "user", content: summary }, messages[messages.length - 1]];
        }
      }
    }

    if (messages[0].role === "system" && processedMessages[0].role !== "system") {
      processedMessages.unshift(messages[0]);
    }

    return processedMessages;
  }
}

export default AIService;
