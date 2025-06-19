import charPrompt from "$lib/data/character_prompt.txt?raw";
import { errorHandler } from "$lib/helpers/ai-error-handler";
import { getAgentByName, type AgentWithUsage } from "$lib/server/agents-service";
import {
  addConversationMessage,
  getConversationMessage,
  getLastSummary
} from "$lib/server/conversations-service";
import { getUser } from "$lib/server/users-service";
import { AgentType, AIProvider } from "$lib/types/db";
import { createAnthropic, type AnthropicProvider } from "@ai-sdk/anthropic";
import {
  createGoogleGenerativeAI,
  type GoogleGenerativeAIProvider,
  type GoogleGenerativeAIProviderOptions
} from "@ai-sdk/google";
import { createMistral, type MistralProvider } from "@ai-sdk/mistral";
import { createOpenAI, type OpenAIProvider } from "@ai-sdk/openai";
import type { Agent, Model } from "@prisma/client";
import { generateText, streamText } from "ai";
import type { ChatMessage } from "gpt-tokenizer/GptEncoding";
import { isWithinTokenLimit } from "gpt-tokenizer/model/gpt-4";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface safetySettings {
  category:
    | "HARM_CATEGORY_DANGEROUS_CONTENT"
    | "HARM_CATEGORY_HARASSMENT"
    | "HARM_CATEGORY_HATE_SPEECH"
    | "HARM_CATEGORY_SEXUALLY_EXPLICIT";
  threshold: "BLOCK_NONE";
}

interface GoogleSettings {
  safetySettings: safetySettings[];
}

class AIService {
  private client: MistralProvider | OpenAIProvider | GoogleGenerativeAIProvider | AnthropicProvider;
  private readonly LIMIT_MULTIPLIER = 0.9; // We use 90% of the token limit to give us some headroom
  private readonly GOOGLE_SETTINGS: GoogleSettings = {
    safetySettings: [
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" }
    ]
  };

  constructor(
    private provider: AIProvider,
    private apiKey: string
  ) {
    if (provider === "mistral") {
      this.client = createMistral({ apiKey: apiKey });
    } else if (provider === "openai") {
      this.client = createOpenAI({ apiKey: apiKey });
    } else if (provider === "google") {
      this.client = createGoogleGenerativeAI({ apiKey: apiKey });
    } else if (provider === "anthropic") {
      this.client = createAnthropic({ apiKey: apiKey });
    } else {
      throw new Error("Unsupported AI provider");
    }
  }

  async run(
    messages: Message[],
    model: Model,
    userId: string,
    agent?: AgentWithUsage,
    conversationId?: string,
    regenerate?: boolean,
    messageId?: string
  ) {
    const processedMessages = await this.preProcess(messages, model, userId, agent, conversationId);

    const onCompletion = async ({ text }: { text: string }) => {
      if (conversationId) {
        if (!regenerate && messages.at(-1)?.role === "user") {
          await addConversationMessage(
            conversationId,
            messages.at(-1)?.content as string,
            "user",
            userId,
            messageId
          );
        }
        await addConversationMessage(
          conversationId,
          text,
          "assistant",
          undefined,
          undefined,
          false,
          regenerate
        );
        this.postProcess(processedMessages as Message[], model, userId, agent, conversationId);
      }
    };

    const response = this.getResponse(
      processedMessages as Message[],
      model.id,
      await this.prepareSystemPrompt(agent, userId),
      onCompletion
    );

    const stream = response.toDataStreamResponse({
      getErrorMessage: errorHandler,
      sendReasoning: true
    });

    return stream;
  }

  private getResponse(
    messages: Message[],
    modelId: string,
    system?: string,
    onFinish?: ({ text }: { text: string }) => void
  ) {
    const result = streamText({
      model: this.client(modelId, this.provider === "google" ? this.GOOGLE_SETTINGS : undefined),
      messages,
      system,
      temperature: 1.0,
      onFinish,
      onChunk({ chunk }) {
        if (chunk.type === "reasoning") {
          console.log(chunk.textDelta);
        }
      },
      providerOptions: {
        googleGenerativeAI: {
          thinkingConfig: {
            includeThoughts: true
          }
        } satisfies GoogleGenerativeAIProviderOptions
      }
    });

    return result;
  }

  private async generateSummary(messages: Message[], modelId: string, system?: string) {
    const prompt =
      "Summarise this conversation. Keep it concise, but retain as much information as possible.";

    const { text } = await generateText({
      model: this.client(modelId, this.provider === "google" ? this.GOOGLE_SETTINGS : undefined),
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
    if (!conversationId) {
      return messages;
    }

    // First, see if we fit as-is (with agent instructions if any)
    const systemPrompt = agent?.instructions
      ? [{ role: "system", content: (await this.prepareSystemPrompt(agent, userId)) ?? "" }]
      : [];
    let testFull = [...systemPrompt, ...messages];

    if (this.isWithinLimit(testFull, model.tokenLimit * this.LIMIT_MULTIPLIER)) {
      return messages;
    }

    // We only do the chunking logic if there's a summary
    const summary = await getLastSummary(conversationId);
    if (!summary) {
      return messages;
    }

    let parentIndex = -1;
    if (summary.parentId) {
      const parentMsg = await getConversationMessage(conversationId, summary.parentId);
      if (!parentMsg) {
        throw new Error("Parent message not found");
      }
      // Find where that parent message appears in the local messages array
      parentIndex = messages.findLastIndex(
        (message) => message.content === parentMsg.content && message.role === parentMsg.role
      );
      if (parentIndex === -1) {
        throw new Error("Message not found");
      }
    } else {
      // If there's a summary but no parentId, treat it as summarizing everything
      // except possibly the very last user message
      parentIndex = messages.length - 2; // i.e., up to second last message
    }

    // We'll try to keep the last up to 20 messages before the summary
    const messagesBeforeSummary = messages.slice(0, parentIndex + 1);
    const messagesAfterSummary = messages.slice(parentIndex + 1);

    let chunkSize = Math.min(20, messagesBeforeSummary.length);
    let finalMessages: Message[] = [];

    // Try decreasing chunkSize by 2 until we fit
    while (chunkSize >= 0) {
      // Gather only the last `chunkSize` messages before the summary
      const contextSlice = messagesBeforeSummary.slice(messagesBeforeSummary.length - chunkSize);

      // Insert the summary as a message just after that context
      finalMessages = [
        { role: summary.role, content: summary.content },
        ...contextSlice,
        ...messagesAfterSummary
      ];

      // Re-check with agent instructions
      testFull = agent?.instructions
        ? [
            { role: "system", content: (await this.prepareSystemPrompt(agent, userId)) ?? "" },
            ...finalMessages
          ]
        : finalMessages;

      if (this.isWithinLimit(testFull, model.tokenLimit * this.LIMIT_MULTIPLIER)) {
        return finalMessages;
      }
      chunkSize -= 2;
    }

    // As a fallback, if we cannot get under the limit at all,
    // just return the summary plus the very last message
    return [{ role: summary.role, content: summary.content }, messages.at(-1)!];
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
      ? [
          { role: "system", content: (await this.prepareSystemPrompt(agent, userId)) ?? "" },
          ...messages
        ]
      : messages;

    if (this.isWithinLimit(messagesWithSystemPrompt, model.tokenLimit * this.LIMIT_MULTIPLIER)) {
      return messages;
    }

    const summary = await this.generateSummary(
      messages,
      model.id,
      await this.prepareSystemPrompt(agent, userId)
    );
    await addConversationMessage(conversationId, summary, "user", userId, messageId, true);

    return messages;
  }

  public async generateConversationName(
    messages: Message[],
    modelId: string,
    userId: string
  ): Promise<string> {
    if (messages.length === 0) {
      return "New Chat";
    }

    const prompt = `Generate a concise, engaging title of five words or fewer for this conversation based on the following messages. The title should capture the main theme or topic without revealing specific details or spoilers.\n\n---\n\n${messages
      .map(({ role, content }) => `${role}: ${content}`)
      .join("\n")}`;

    const titleGenerator = await getAgentByName(userId, "Title Generator");

    const { text } = await generateText({
      model: this.client(modelId, this.provider === "google" ? this.GOOGLE_SETTINGS : undefined),
      messages: [{ role: "user", content: prompt }],
      system: titleGenerator?.instructions ?? undefined
    });

    return text.trim().replaceAll('"', "").replaceAll("*", "").replaceAll("#", "");
  }

  public async generateFollowUps(
    messages: { role: string; content: string }[],
    modelId: string
  ): Promise<string[]> {
    const prompt =
      "Based on the following conversation, suggest three possible follow-up questions or next steps the user might say. Respond with a numbered list of exactly three items, no additional commentary. Follow the style and tone of the user's existing messages as closely as possible, especially in longer conversations. Do not enclose the suggestions in quotes.";

    const context = messages.map(({ role, content }) => `${role}: ${content}`).join("\n");

    const { text } = await generateText({
      model: this.client(modelId, this.provider === "google" ? this.GOOGLE_SETTINGS : undefined),
      messages: [{ role: "user", content: prompt + "\n\n---\n\n" + context }],
      system: undefined,
      temperature: 1.0
    });

    // Split by lines and strip numbering and quotes
    return text
      .split("\n")
      .map((line) =>
        line
          .replace(/^\s*\d+\.\s*/, "")
          .replace(/["“”]/g, "")
          .trim()
      )
      .filter((line) => line.length > 0)
      .slice(0, 3);
  }

  private async prepareSystemPrompt(
    agent: Agent | undefined,
    userId: string
  ): Promise<string | undefined> {
    if (!agent) return undefined;
    const user = await getUser(userId);

    if (!user) return undefined;

    if (agent.type === AgentType.Default) {
      return agent.instructions;
    }

    const prompt = charPrompt
      .replace("{{character_definition}}", agent.instructions)
      .replaceAll("{{char}}", agent.name)
      .replaceAll("{{user}}", user.username.charAt(0).toUpperCase() + user.username.slice(1));

    return prompt;
  }
}

export default AIService;
