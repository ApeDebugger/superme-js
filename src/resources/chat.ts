import { HttpClient } from "../http-client.js";
import { ChatCompletionOptions, ChatCompletion } from "../types.js";

export class ChatCompletions {
  constructor(private http: HttpClient) {}

  async create(options: ChatCompletionOptions): Promise<ChatCompletion> {
    const lastUserMessage = [...options.messages]
      .reverse()
      .find((m) => m.role === "user");

    if (!lastUserMessage) {
      throw new Error("At least one user message is required.");
    }

    const response = await this.http.toolCall<{
      response: string;
      conversation_id: string | null;
    }>(options.username ? "ask" : "ask_my_agent", {
      question: lastUserMessage.content,
      ...(options.username && { username: options.username }),
      ...(options.conversationId && { conversation_id: options.conversationId }),
      ...(options.maxTokens && { max_tokens: options.maxTokens }),
    });

    const content =
      typeof response === "string"
        ? response
        : (response as { response: string }).response ?? JSON.stringify(response);

    const conversationId =
      typeof response === "object" && "conversation_id" in response
        ? (response as { conversation_id: string | null }).conversation_id
        : null;

    return {
      id: `superme-${Date.now()}`,
      object: "chat.completion",
      model: options.model ?? "superme-agent",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content },
          finish_reason: "stop",
        },
      ],
      metadata: { conversation_id: conversationId },
    };
  }
}

export class Chat {
  readonly completions: ChatCompletions;
  constructor(http: HttpClient) {
    this.completions = new ChatCompletions(http);
  }
}
