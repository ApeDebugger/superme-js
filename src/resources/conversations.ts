import { HttpClient } from "../http-client.js";
import {
  AskOptions,
  AgentResponse,
  GroupConverseOptions,
  GroupConverseResult,
  GroupConverseChunk,
  Conversation,
} from "../types.js";

export class ConversationsResource {
  constructor(private http: HttpClient) {}

  /**
   * Ask a question to a specific user's SuperMe agent.
   */
  async ask(question: string, username: string, options: AskOptions = {}): Promise<string> {
    const result = await this.http.toolCall<string>("ask", {
      question,
      username,
      ...(options.conversationId && { conversation_id: options.conversationId }),
      ...(options.maxTokens && { max_tokens: options.maxTokens }),
      ...(options.incognito !== undefined && { incognito: options.incognito }),
    });
    return typeof result === "string" ? result : JSON.stringify(result);
  }

  /**
   * Talk to your own SuperMe AI agent.
   */
  async askMyAgent(question: string, options: AskOptions = {}): Promise<AgentResponse> {
    return this.http.toolCall<AgentResponse>("ask_my_agent", {
      question,
      ...(options.conversationId && { conversation_id: options.conversationId }),
    });
  }

  /**
   * Stream your own agent's response. Yields string chunks.
   * Final item includes `{ _done: true, conversation_id }`.
   */
  async *askMyAgentStream(
    question: string,
    options: AskOptions = {}
  ): AsyncGenerator<{ chunk?: string; _done?: boolean; conversation_id?: string }> {
    yield* this.http.toolCallStream("ask_my_agent_stream", {
      question,
      ...(options.conversationId && { conversation_id: options.conversationId }),
    });
  }

  /**
   * List your most recent conversations.
   */
  async list(limit = 10): Promise<Conversation[]> {
    return this.http.toolCall<Conversation[]>("list_conversations", { limit });
  }

  /**
   * Fetch a single conversation with all its messages.
   */
  async get(conversationId: string): Promise<Conversation> {
    return this.http.toolCall<Conversation>("get_conversation", {
      conversation_id: conversationId,
    });
  }

  /**
   * Start or continue a multi-turn group conversation between multiple users.
   */
  async groupConverse(
    participants: string[],
    topic: string,
    options: GroupConverseOptions = {}
  ): Promise<GroupConverseResult> {
    return this.http.toolCall<GroupConverseResult>("group_converse", {
      participants,
      topic,
      ...(options.maxTurns && { max_turns: options.maxTurns }),
      ...(options.conversationId && { conversation_id: options.conversationId }),
    });
  }

  /**
   * Stream a group conversation.
   * Yields per-perspective chunks. Final item has `{ _done: true }`.
   */
  async *groupConverseStream(
    participants: string[],
    topic: string,
    options: GroupConverseOptions = {}
  ): AsyncGenerator<GroupConverseChunk> {
    yield* this.http.toolCallStream<GroupConverseChunk>("group_converse_stream", {
      participants,
      topic,
      ...(options.maxTurns && { max_turns: options.maxTurns }),
      ...(options.conversationId && { conversation_id: options.conversationId }),
    });
  }
}
