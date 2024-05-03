import type { AIProvider, Agent, Model } from "$lib/drizzle/schema";
import {
  addConversationMessage,
  getConversationMessage,
  getLastSummary
} from "$lib/server/conversations-service";
import { createMistral, type MistralProvider } from "@ai-sdk/mistral";
import { createOpenAI, type OpenAIProvider } from "@ai-sdk/openai";
import { StreamingTextResponse, generateText, streamText } from "ai";
import type { ChatMessage } from "gpt-tokenizer/GptEncoding";
import { isWithinTokenLimit } from "gpt-tokenizer/model/gpt-4";

interface Message {
  role: "user" | "assistant";
  content: string;
}

class AIService {
  private client: MistralProvider | OpenAIProvider;
  private readonly LIMIT_MULTIPLIER = 0.9; // We use 90% of the token limit to give us some headroom

  constructor(
    private provider: AIProvider,
    private apiKey: string
  ) {
    if (provider === "mistral") {
      this.client = createMistral({ apiKey: apiKey });
    } else if (provider === "openai") {
      this.client = createOpenAI({ apiKey: apiKey });
    } else {
      throw new Error("Unsupported AI provider");
    }
  }

  async run(
    messages: Message[],
    model: Model,
    userId: string,
    agent?: Agent,
    conversationId?: string,
    regenerate?: boolean,
    messageId?: string
  ) {
    const processedMessages = await this.preProcess(messages, model, userId, agent, conversationId);

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
        this.postProcess(processedMessages as Message[], model, userId, agent, conversationId);
      }
    };

    console.log("We are sending the following messages to the AI");
    console.log(processedMessages);
    const response = await this.getResponse(
      processedMessages as Message[],
      model.id,
      agent?.instructions
    );

    const stream = response.toAIStream({
      onFinal: onCompletion
    });

    return new StreamingTextResponse(stream);
  }

  private async getResponse(messages: Message[], modelId: string, system?: string) {
    const result = await streamText({
      model: this.client(modelId),
      messages,
      system,
      temperature: 1.0
    });

    return result;
  }

  private async generateSummary(messages: Message[], modelId: string, system?: string) {
    const prompt =
      "Summarise this conversation. Keep it concise, but retain as much information as possible.";

    const { text } = await generateText({
      model: this.client(modelId),
      messages: [...messages.slice(0, -1), { role: "user", content: prompt }],
      system,
      temperature: 0.5
    });

    return text;
  }

  private isWithinLimit(messages: { role: string; content: string }[], limit: number): boolean {
    const isWithinLimit = isWithinTokenLimit(messages as ChatMessage[], limit);

    return !!isWithinLimit;
  }

  private async preProcess(
    messages: Message[],
    model: Model,
    userId: string,
    agent?: Agent,
    conversationId?: string
  ) {
    console.log("Pre-processing messages");
    if (!conversationId) {
      console.log("No conversation ID, returning messages");
      return messages;
    }

    let processedMessages = agent?.instructions
      ? [{ role: "system", content: agent.instructions }, ...messages]
      : messages;

    if (this.isWithinLimit(processedMessages, model.tokenLimit * this.LIMIT_MULTIPLIER)) {
      console.log("Within limit, returning messages");
      return messages;
    }

    const summary = await getLastSummary(conversationId);

    if (!summary) {
      console.log("No summary found, returning messages");
      return messages;
    }

    if (!summary.parentId) {
      console.log("No parent message found, returning messages");
      return [{ role: summary.role, content: summary.content }, messages.at(-1)];
    }

    const parentMessage = await getConversationMessage(conversationId, summary.parentId);

    if (!parentMessage) {
      console.log("Parent message not found, throwing error");
      throw new Error("Parent message not found");
    }

    const index = messages.findLastIndex(
      (message) => message.content === parentMessage.content && message.role === parentMessage.role
    );

    if (index === -1) {
      console.log("Message not found, throwing error");
      throw new Error("Message not found");
    }

    processedMessages = [
      { role: summary.role, content: summary.content },
      ...messages.slice(index + 1)
    ];

    return processedMessages;
  }

  private async postProcess(
    messages: Message[],
    model: Model,
    userId: string,
    agent?: Agent,
    conversationId?: string,
    messageId?: string
  ) {
    if (!conversationId) {
      return messages;
    }

    const messagesWithSystemPrompt = agent?.instructions
      ? [{ role: "system", content: agent.instructions }, ...messages]
      : messages;

    console.log("Checking if within limit");
    if (this.isWithinLimit(messagesWithSystemPrompt, model.tokenLimit * this.LIMIT_MULTIPLIER)) {
      console.log("Within limit");
      return messages;
    }

    console.log("Exceeded limit, generating summary");

    const summary = await this.generateSummary(messages, model.id, agent?.instructions);
    console.log("Generated summary, saving to database");
    await addConversationMessage(conversationId, summary, "user", userId, messageId, true);

    return messages;
  }
}

export default AIService;
