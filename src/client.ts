import { HttpClient } from "./http-client.js";
import { ConversationsResource } from "./resources/conversations.js";
import { ProfilesResource } from "./resources/profiles.js";
import { ContentResource } from "./resources/content.js";
import { SocialResource } from "./resources/social.js";
import { InterviewsResource } from "./resources/interviews.js";
import { Chat } from "./resources/chat.js";
import { SuperMeClientOptions } from "./types.js";

export class SuperMeClient {
  /** Ask experts, manage conversations, stream agent responses */
  readonly conversations: ConversationsResource;

  /** Look up profiles, search experts, get perspectives */
  readonly profiles: ProfilesResource;

  /** Manage your personal knowledge library */
  readonly content: ContentResource;

  /** Connect and manage social accounts */
  readonly social: SocialResource;

  /** Browse roles and run AI-powered interviews */
  readonly interviews: InterviewsResource;

  /** OpenAI-compatible chat interface */
  readonly chat: Chat;

  private readonly http: HttpClient;

  constructor(options: SuperMeClientOptions) {
    this.http = new HttpClient(options);
    this.conversations = new ConversationsResource(this.http);
    this.profiles = new ProfilesResource(this.http);
    this.content = new ContentResource(this.http);
    this.social = new SocialResource(this.http);
    this.interviews = new InterviewsResource(this.http);
    this.chat = new Chat(this.http);
  }

  // ─── Low-level access ───────────────────────────────────────────────────────

  /**
   * Call any MCP tool by name with raw arguments.
   */
  async mcpToolCall<T = unknown>(
    toolName: string,
    args: Record<string, unknown> = {}
  ): Promise<T> {
    return this.http.toolCall<T>(toolName, args);
  }

  /**
   * List all available MCP tools.
   */
  async mcpListTools(): Promise<unknown[]> {
    const result = await this.http.rawRequest<{ tools: unknown[] }>("tools/list");
    return result.tools ?? [];
  }

  /**
   * Raw MCP JSON-RPC request.
   */
  async rawRequest<T = unknown>(
    method: string,
    params?: Record<string, unknown>
  ): Promise<T> {
    return this.http.rawRequest<T>(method, params);
  }
}
