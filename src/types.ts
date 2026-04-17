// ─── Client config ───────────────────────────────────────────────────────────

export interface SuperMeClientOptions {
  /** API key from superme.ai/settings → API Keys */
  apiKey: string;
  /** MCP base URL. Defaults to https://mcp.superme.ai */
  mcpBaseUrl?: string;
  /** REST base URL. Defaults to https://www.superme.ai */
  restBaseUrl?: string;
  /** Request timeout in ms. Defaults to 120_000 */
  timeout?: number;
}

// ─── MCP transport ───────────────────────────────────────────────────────────

export interface MCPRequest {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
  id: number;
}

export interface MCPResponse<T = unknown> {
  jsonrpc: "2.0";
  id: number | string;
  result?: {
    content: Array<{ type: string; text: string }>;
    structuredContent?: { result: string };
    isError: boolean;
  };
  error?: {
    code: number;
    message: string;
  };
}

// ─── Conversations ────────────────────────────────────────────────────────────

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface AskOptions {
  conversationId?: string;
  maxTokens?: number;
  incognito?: boolean;
}

export interface AgentResponse {
  response: string;
  conversation_id: string | null;
}

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  messages: Message[];
  [key: string]: unknown;
}

// ─── Profiles & search ───────────────────────────────────────────────────────

export interface Profile {
  name: string;
  title?: string;
  avatar_image?: string;
  location?: string;
  [key: string]: unknown;
}

export interface FindUserResult {
  users: Profile[];
  [key: string]: unknown;
}

export interface PerspectiveResult {
  perspectives: Array<{
    username: string;
    response: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

// ─── Group conversations ──────────────────────────────────────────────────────

export interface GroupConverseOptions {
  maxTurns?: number;
  conversationId?: string;
}

export interface GroupConverseResult {
  conversation_id: string;
  turns: Array<{
    username: string;
    response: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export interface GroupConverseChunk {
  username?: string;
  response?: string;
  _done?: boolean;
  conversation_id?: string;
  [key: string]: unknown;
}

// ─── Content ─────────────────────────────────────────────────────────────────

export interface AddInternalContentOptions {
  extendedContent?: string;
  pastInstructions?: string;
}

export interface UpdateInternalContentOptions {
  userInput?: string;
  extendedContent?: string;
  pastInstructions?: string;
}

export interface AddExternalContentOptions {
  reference?: string;
  instantRecrawl?: boolean;
}

export interface ContentResult {
  learning_id?: string;
  status?: string;
  [key: string]: unknown;
}

export interface UncrawledResult {
  uncrawled: string[];
  [key: string]: unknown;
}

// ─── Social accounts ─────────────────────────────────────────────────────────

export type SocialPlatform =
  | "medium"
  | "substack"
  | "x"
  | "instagram"
  | "youtube"
  | "beehiiv"
  | "google_drive"
  | "linkedin"
  | "github"
  | "notion";

export interface ConnectedAccountsResult {
  accounts: Array<{
    platform: string;
    handle: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export interface SocialResult {
  status: string;
  [key: string]: unknown;
}

// ─── Interviews ───────────────────────────────────────────────────────────────

export interface Role {
  id: string;
  title: string;
  company: string;
  [key: string]: unknown;
}

export interface Interview {
  interview_id: string;
  status: string;
  [key: string]: unknown;
}

export interface InterviewEvent {
  event: string;
  status?: string;
  _done?: boolean;
  [key: string]: unknown;
}

export interface InterviewTranscript {
  interview_id: string;
  transcript: Array<{
    role: string;
    content: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

// ─── OpenAI-compatible ───────────────────────────────────────────────────────

export interface ChatCompletionMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatCompletionOptions {
  messages: ChatCompletionMessage[];
  model?: string;
  username?: string;
  conversationId?: string;
  maxTokens?: number;
}

export interface ChatCompletion {
  id: string;
  object: "chat.completion";
  model: string;
  choices: Array<{
    index: number;
    message: { role: "assistant"; content: string };
    finish_reason: "stop";
  }>;
  metadata: {
    conversation_id: string | null;
  };
}

// ─── Errors ───────────────────────────────────────────────────────────────────

export class SuperMeError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "SuperMeError";
  }
}

export class SuperMeAuthError extends SuperMeError {
  constructor() {
    super("Invalid or missing API key. Get one at superme.ai/settings → API Keys.", 401);
    this.name = "SuperMeAuthError";
  }
}

export class SuperMeTimeoutError extends SuperMeError {
  constructor() {
    super("Request timed out.");
    this.name = "SuperMeTimeoutError";
  }
}
