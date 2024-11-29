import charPrompt from "$lib/data/character_prompt.txt?raw";
import {
  AgentType,
  AIProvider,
  type Agent,
  type AgentWithUsage,
  type Model
} from "$lib/drizzle/schema";
import {
  addConversationMessage,
  getConversationMessage,
  getLastSummary
} from "$lib/server/conversations-service";
import { getUser } from "$lib/server/users-service";
import { createGoogleGenerativeAI, type GoogleGenerativeAIProvider } from "@ai-sdk/google";
import { createMistral, type MistralProvider } from "@ai-sdk/mistral";
import { createOpenAI, type OpenAIProvider } from "@ai-sdk/openai";
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
  private client: MistralProvider | OpenAIProvider | GoogleGenerativeAIProvider;
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

    const stream = response.toDataStreamResponse();

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
      onFinish
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

    let processedMessages = agent?.instructions
      ? [{ role: "system", content: await this.prepareSystemPrompt(agent, userId) }, ...messages]
      : messages;

    if (this.isWithinLimit(processedMessages, model.tokenLimit * this.LIMIT_MULTIPLIER)) {
      return messages;
    }

    const summary = await getLastSummary(conversationId);

    if (!summary) {
      return messages;
    }

    if (!summary.parentId) {
      return [{ role: summary.role, content: summary.content }, messages.at(-1)];
    }

    const parentMessage = await getConversationMessage(conversationId, summary.parentId);

    if (!parentMessage) {
      throw new Error("Parent message not found");
    }

    const index = messages.findLastIndex(
      (message) => message.content === parentMessage.content && message.role === parentMessage.role
    );

    if (index === -1) {
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
      ? [{ role: "system", content: await this.prepareSystemPrompt(agent, userId) }, ...messages]
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
    messages: { role: string; content: string }[],
    modelId: string
  ) {
    const prompt =
      "Summarise the following conversation in five words or fewer. Be as concise as possible without losing the context of the conversation. Your goal is to extract the key point of the conversation and turn it into a short and interesting title. Respond only with the title and nothing else.";

    let messageContext: typeof messages;

    if (messages.at(0)?.role === "assistant") {
      messageContext = messages.slice(0, 3);
    } else {
      messageContext = messages.slice(0, 2);
    }

    const context = messageContext.map(({ role, content }) => `${role}: ${content}`).join("\n");

    const { text } = await generateText({
      model: this.client(modelId, this.provider === "google" ? this.GOOGLE_SETTINGS : undefined),
      messages: [{ role: "user", content: prompt + "\n\n---\n\n" + context }]
    });

    return text.trim().replaceAll('"', "");
  }

  private async prepareSystemPrompt(agent: Agent | undefined, userId: string): Promise<string> {
    if (!agent) return "";
    const user = await getUser(userId);

    if (!user) return "";

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
