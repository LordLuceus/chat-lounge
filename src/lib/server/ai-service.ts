import charPrompt from "$lib/data/character_prompt.txt?raw";
import { formatMessageContent } from "$lib/helpers";
import { errorHandler } from "$lib/helpers/ai-error-handler";
import { getAgentByName, type AgentWithUsage } from "$lib/server/agents-service";
import {
  addConversationMessage,
  getConversationMessage,
  getLastSummary
} from "$lib/server/conversations-service";
import { getUser } from "$lib/server/users-service";
import { AgentType, AIProvider, type DBMessage } from "$lib/types/db";
import {
  createAnthropic,
  type AnthropicProvider,
  type AnthropicProviderOptions
} from "@ai-sdk/anthropic";
import {
  createGoogleGenerativeAI,
  type GoogleGenerativeAIProvider,
  type GoogleGenerativeAIProviderOptions
} from "@ai-sdk/google";
import { createMistral, type MistralProvider } from "@ai-sdk/mistral";
import { createOpenAI, type OpenAIProvider } from "@ai-sdk/openai";
import { createXai, type XaiProvider } from "@ai-sdk/xai";
import {
  createOpenRouter,
  type OpenRouterProvider,
  type OpenRouterProviderOptions
} from "@openrouter/ai-sdk-provider";
import type { Agent, Model } from "@prisma/client";
import {
  convertToModelMessages,
  generateText,
  streamText,
  type UIDataTypes,
  type UIMessage,
  type UIMessagePart,
  type UITools
} from "ai";
import type { ChatMessage } from "gpt-tokenizer/GptEncoding";
import { isWithinTokenLimit } from "gpt-tokenizer/model/gpt-4";
import { v4 as uuidv4 } from "uuid";

class AIService {
  private client:
    | MistralProvider
    | OpenAIProvider
    | GoogleGenerativeAIProvider
    | AnthropicProvider
    | XaiProvider
    | OpenRouterProvider;
  private readonly LIMIT_MULTIPLIER = 0.9; // We use 90% of the token limit to give us some headroom
  private readonly GOOGLE_SETTINGS: GoogleGenerativeAIProviderOptions = {
    safetySettings: [
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" }
    ],
    thinkingConfig: { includeThoughts: true }
  };

  constructor(
    private provider: AIProvider,
    private apiKey: string
  ) {
    if (provider === "mistral") {
      this.client = createMistral({ apiKey });
    } else if (provider === "openai") {
      this.client = createOpenAI({ apiKey });
    } else if (provider === "google") {
      this.client = createGoogleGenerativeAI({ apiKey });
    } else if (provider === "anthropic") {
      this.client = createAnthropic({ apiKey });
    } else if (provider === "xai") {
      this.client = createXai({ apiKey });
    } else if (provider === "openrouter") {
      this.client = createOpenRouter({ apiKey });
    } else {
      throw new Error("Unsupported AI provider");
    }
  }

  async run(
    messages: UIMessage[],
    model: Model,
    userId: string,
    agent?: AgentWithUsage,
    conversationId?: string,
    regenerate?: boolean,
    messageId?: string,
    thinking?: boolean
  ) {
    const processedMessages = await this.preProcess(messages, model, userId, agent, conversationId);

    const response = this.getResponse(
      processedMessages,
      model.id,
      await this.prepareSystemPrompt(agent, userId),
      thinking
    );

    const stream = response.toUIMessageStreamResponse({
      onError: errorHandler,
      originalMessages: messages,
      onFinish: async ({ responseMessage }) => {
        if (conversationId) {
          if (!regenerate && messages.at(-1)?.role === "user") {
            await addConversationMessage(
              conversationId,
              messages.at(-1)?.parts || [],
              "user",
              userId,
              messageId
            );
          }
          await addConversationMessage(
            conversationId,
            responseMessage.parts,
            "assistant",
            undefined,
            undefined,
            false,
            regenerate,
            model.id
          );
          this.postProcess(processedMessages, model, userId, agent, conversationId);
        }
      }
    });

    return stream;
  }

  private getResponse(messages: UIMessage[], modelId: string, system?: string, thinking?: boolean) {
    const result = streamText({
      model: this.client(modelId),
      messages: convertToModelMessages(messages),
      system,
      temperature: 1.0,
      providerOptions: {
        google: this.GOOGLE_SETTINGS,
        openrouter: {
          reasoning: {
            effort: "medium",
            enabled: thinking ?? false
          }
        } satisfies OpenRouterProviderOptions,
        anthropic: {
          thinking: {
            type: thinking ? "enabled" : "disabled",
            budgetTokens: 4096
          }
        } satisfies AnthropicProviderOptions
      }
    });

    return result;
  }

  private async generateSummary(messages: UIMessage[], modelId: string, system?: string) {
    const prompt =
      "Summarise this conversation. Keep it concise, but retain as much information as possible.";

    const { text } = await generateText({
      model: this.client(modelId),
      messages: convertToModelMessages([
        ...messages.slice(0, -1),
        { role: "user", parts: [{ type: "text", text: prompt }] }
      ]),
      system,
      temperature: 0.5
    });

    return text;
  }

  private isWithinLimit(messages: ChatMessage[], limit: number): boolean {
    const isWithinLimit = isWithinTokenLimit(messages, limit);

    return !!isWithinLimit;
  }

  private async preProcess(
    messages: UIMessage[],
    model: Model,
    userId: string,
    agent?: Agent,
    conversationId?: string
  ): Promise<UIMessage[]> {
    if (!conversationId) {
      return messages;
    }

    // First, see if we fit as-is (with agent instructions if any)
    const systemPrompt = agent?.instructions
      ? [
          {
            id: uuidv4(),
            role: "system" as const,
            parts: [
              { type: "text" as const, text: (await this.prepareSystemPrompt(agent, userId)) ?? "" }
            ]
          }
        ]
      : [];
    let testFull = [...systemPrompt, ...messages];

    if (
      this.isWithinLimit(
        this.convertToChatMessages(testFull),
        model.tokenLimit * this.LIMIT_MULTIPLIER
      )
    ) {
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
        (message) => message.parts === parentMsg.parts && message.role === parentMsg.role
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
    let finalMessages: UIMessage[] = [];

    // Try decreasing chunkSize by 2 until we fit
    while (chunkSize >= 0) {
      // Gather only the last `chunkSize` messages before the summary
      const contextSlice = messagesBeforeSummary.slice(messagesBeforeSummary.length - chunkSize);

      // Insert the summary as a message just after that context
      finalMessages = [
        {
          role: summary.role,
          parts: summary.parts as UIMessagePart<UIDataTypes, UITools>[],
          id: summary.id
        },
        ...contextSlice,
        ...messagesAfterSummary
      ];

      // Re-check with agent instructions
      testFull = agent?.instructions
        ? [
            {
              id: uuidv4(),
              role: "system",
              parts: [
                {
                  type: "text" as const,
                  text: (await this.prepareSystemPrompt(agent, userId)) ?? ""
                }
              ]
            },
            ...finalMessages
          ]
        : finalMessages;

      if (
        this.isWithinLimit(
          this.convertToChatMessages(testFull),
          model.tokenLimit * this.LIMIT_MULTIPLIER
        )
      ) {
        return finalMessages;
      }
      chunkSize -= 2;
    }

    // As a fallback, if we cannot get under the limit at all,
    // just return the summary plus the very last message
    return [
      {
        role: summary.role,
        parts: summary.parts as UIMessagePart<UIDataTypes, UITools>[],
        id: summary.id
      },
      messages.at(-1)!
    ];
  }

  private async postProcess(
    messages: UIMessage[],
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
          {
            id: uuidv4(),
            role: "system" as const,
            parts: [
              { type: "text" as const, text: (await this.prepareSystemPrompt(agent, userId)) ?? "" }
            ]
          },
          ...messages
        ]
      : messages;

    if (
      this.isWithinLimit(
        this.convertToChatMessages(messagesWithSystemPrompt),
        model.tokenLimit * this.LIMIT_MULTIPLIER
      )
    ) {
      return messages;
    }

    const summary = await this.generateSummary(
      messages,
      model.id,
      await this.prepareSystemPrompt(agent, userId)
    );
    await addConversationMessage(
      conversationId,
      [{ type: "text", text: summary }],
      "user",
      userId,
      messageId,
      true
    );

    return messages;
  }

  public async generateConversationName(
    messages: Omit<UIMessage, "id">[],
    modelId: string,
    userId: string
  ): Promise<string> {
    if (messages.length === 0) {
      return "New Chat";
    }

    const prompt = `Generate a concise, engaging title of five words or fewer for this conversation based on the following messages. The title should capture the main theme or topic without revealing specific details or spoilers.\n\n---\n\n${messages
      .map(({ role, parts }) => `${role}: ${formatMessageContent(parts)}`)
      .join("\n")}`;

    const titleGenerator = await getAgentByName(userId, "Title Generator");

    const { text } = await generateText({
      model: this.client(modelId),
      messages: [{ role: "user", content: prompt }],
      system: titleGenerator?.instructions ?? undefined,
      temperature: 1.0,
      providerOptions: {
        google: this.GOOGLE_SETTINGS as GoogleGenerativeAIProviderOptions
      }
    });

    return text.trim().replaceAll('"', "").replaceAll("*", "").replaceAll("#", "");
  }

  public async generateFollowUps(messages: DBMessage[], modelId: string): Promise<string[]> {
    const prompt =
      "Based on the following conversation, suggest three possible follow-up questions or next steps the user might say. Respond with a numbered list of exactly three items, no additional commentary. Follow the style and tone of the user's existing messages as closely as possible, especially in longer conversations. Do not enclose the suggestions in quotes.";

    const context = messages
      .map(({ role, parts }) => `${role}: ${formatMessageContent(parts)}`)
      .join("\n");

    const { text } = await generateText({
      model: this.client(modelId),
      messages: [{ role: "user", content: prompt + "\n\n---\n\n" + context }],
      temperature: 1.0,
      providerOptions: {
        google: this.GOOGLE_SETTINGS as GoogleGenerativeAIProviderOptions
      }
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

    // Get verbosity instruction based on agent's verbosity setting
    const getVerbosityInstruction = (verbosity: string | null | undefined): string => {
      switch (verbosity) {
        case "concise":
          return "- Keep responses concise (no longer than ~200 words), and allow {{user}} to respond to {{char}}'s actions or statements. I.E., avoid skipping forward or having {{char}} do multiple things in one response.";
        case "verbose":
          return "- Provide detailed, comprehensive responses that fully explore {{char}}'s thoughts, emotions, and actions. Take time to describe the scene, {{char}}'s internal state, and the nuances of their interactions. Feel free to write longer responses that capture the depth of the moment.";
        case "default":
        default:
          return ""; // No specific verbosity instruction for default
      }
    };

    const prompt = charPrompt
      .replace("{{character_definition}}", agent.instructions)
      .replaceAll("{{char}}", agent.name)
      .replaceAll("{{user}}", user.username.charAt(0).toUpperCase() + user.username.slice(1))
      .replace("{{verbosity}}", getVerbosityInstruction(agent.verbosity));

    return prompt;
  }

  private convertToChatMessages(messages: UIMessage[]): ChatMessage[] {
    return messages.map((message) => ({
      role: message.role,
      content: formatMessageContent(message.parts)
    }));
  }
}

export default AIService;
