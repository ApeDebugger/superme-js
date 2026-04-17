interface SuperMeClientOptions {
    /** API key from superme.ai/settings → API Keys */
    apiKey: string;
    /** MCP base URL. Defaults to https://mcp.superme.ai */
    mcpBaseUrl?: string;
    /** REST base URL. Defaults to https://www.superme.ai */
    restBaseUrl?: string;
    /** Request timeout in ms. Defaults to 120_000 */
    timeout?: number;
}
interface Message {
    role: "user" | "assistant";
    content: string;
}
interface AskOptions {
    conversationId?: string;
    maxTokens?: number;
    incognito?: boolean;
}
interface AgentResponse {
    response: string;
    conversation_id: string | null;
}
interface Conversation {
    id: string;
    created_at: string;
    updated_at: string;
    messages: Message[];
    [key: string]: unknown;
}
interface Profile {
    name: string;
    title?: string;
    avatar_image?: string;
    location?: string;
    [key: string]: unknown;
}
interface FindUserResult {
    users: Profile[];
    [key: string]: unknown;
}
interface PerspectiveResult {
    perspectives: Array<{
        username: string;
        response: string;
        [key: string]: unknown;
    }>;
    [key: string]: unknown;
}
interface GroupConverseOptions {
    maxTurns?: number;
    conversationId?: string;
}
interface GroupConverseResult {
    conversation_id: string;
    turns: Array<{
        username: string;
        response: string;
        [key: string]: unknown;
    }>;
    [key: string]: unknown;
}
interface GroupConverseChunk {
    username?: string;
    response?: string;
    _done?: boolean;
    conversation_id?: string;
    [key: string]: unknown;
}
interface AddInternalContentOptions {
    extendedContent?: string;
    pastInstructions?: string;
}
interface UpdateInternalContentOptions {
    userInput?: string;
    extendedContent?: string;
    pastInstructions?: string;
}
interface AddExternalContentOptions {
    reference?: string;
    instantRecrawl?: boolean;
}
interface ContentResult {
    learning_id?: string;
    status?: string;
    [key: string]: unknown;
}
interface UncrawledResult {
    uncrawled: string[];
    [key: string]: unknown;
}
type SocialPlatform = "medium" | "substack" | "x" | "instagram" | "youtube" | "beehiiv" | "google_drive" | "linkedin" | "github" | "notion";
interface ConnectedAccountsResult {
    accounts: Array<{
        platform: string;
        handle: string;
        [key: string]: unknown;
    }>;
    [key: string]: unknown;
}
interface SocialResult {
    status: string;
    [key: string]: unknown;
}
interface Role {
    id: string;
    title: string;
    company: string;
    [key: string]: unknown;
}
interface Interview {
    interview_id: string;
    status: string;
    [key: string]: unknown;
}
interface InterviewEvent {
    event: string;
    status?: string;
    _done?: boolean;
    [key: string]: unknown;
}
interface InterviewTranscript {
    interview_id: string;
    transcript: Array<{
        role: string;
        content: string;
        [key: string]: unknown;
    }>;
    [key: string]: unknown;
}
interface ChatCompletionMessage {
    role: "user" | "assistant" | "system";
    content: string;
}
interface ChatCompletionOptions {
    messages: ChatCompletionMessage[];
    model?: string;
    username?: string;
    conversationId?: string;
    maxTokens?: number;
}
interface ChatCompletion {
    id: string;
    object: "chat.completion";
    model: string;
    choices: Array<{
        index: number;
        message: {
            role: "assistant";
            content: string;
        };
        finish_reason: "stop";
    }>;
    metadata: {
        conversation_id: string | null;
    };
}
declare class SuperMeError extends Error {
    readonly code?: number | undefined;
    readonly cause?: unknown | undefined;
    constructor(message: string, code?: number | undefined, cause?: unknown | undefined);
}
declare class SuperMeAuthError extends SuperMeError {
    constructor();
}
declare class SuperMeTimeoutError extends SuperMeError {
    constructor();
}

declare class HttpClient {
    readonly mcpBaseUrl: string;
    readonly restBaseUrl: string;
    private readonly apiKey;
    private readonly timeout;
    private requestId;
    constructor(options: SuperMeClientOptions);
    private get authHeaders();
    private parseSSEResponse;
    toolCall<T = unknown>(tool: string, args?: Record<string, unknown>): Promise<T>;
    rawRequest<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T>;
    toolCallStream<T = unknown>(tool: string, args?: Record<string, unknown>): AsyncGenerator<T>;
}

declare class ConversationsResource {
    private http;
    constructor(http: HttpClient);
    /**
     * Ask a question to a specific user's SuperMe agent.
     */
    ask(question: string, username: string, options?: AskOptions): Promise<string>;
    /**
     * Talk to your own SuperMe AI agent.
     */
    askMyAgent(question: string, options?: AskOptions): Promise<AgentResponse>;
    /**
     * Stream your own agent's response. Yields string chunks.
     * Final item includes `{ _done: true, conversation_id }`.
     */
    askMyAgentStream(question: string, options?: AskOptions): AsyncGenerator<{
        chunk?: string;
        _done?: boolean;
        conversation_id?: string;
    }>;
    /**
     * List your most recent conversations.
     */
    list(limit?: number): Promise<Conversation[]>;
    /**
     * Fetch a single conversation with all its messages.
     */
    get(conversationId: string): Promise<Conversation>;
    /**
     * Start or continue a multi-turn group conversation between multiple users.
     */
    groupConverse(participants: string[], topic: string, options?: GroupConverseOptions): Promise<GroupConverseResult>;
    /**
     * Stream a group conversation.
     * Yields per-perspective chunks. Final item has `{ _done: true }`.
     */
    groupConverseStream(participants: string[], topic: string, options?: GroupConverseOptions): AsyncGenerator<GroupConverseChunk>;
}

declare class ProfilesResource {
    private http;
    constructor(http: HttpClient);
    /**
     * Get a user's public profile.
     * Omit identifier to get your own profile.
     */
    get(identifier?: string): Promise<Profile>;
    /**
     * Search for users by name.
     */
    findByName(name: string, limit?: number): Promise<FindUserResult>;
    /**
     * Resolve multiple names to SuperMe users in one call.
     */
    findByNames(names: string[], limitPerName?: number): Promise<FindUserResult>;
    /**
     * Get perspectives from multiple experts on a topic.
     */
    perspectiveSearch(question: string): Promise<PerspectiveResult>;
}

declare class ContentResource {
    private http;
    constructor(http: HttpClient);
    /**
     * Save notes or knowledge to your personal library.
     */
    addInternal(input: string, options?: AddInternalContentOptions): Promise<ContentResult>;
    /**
     * Update an existing note in your library.
     */
    updateInternal(learningId: string, options?: UpdateInternalContentOptions): Promise<ContentResult>;
    /**
     * Submit URLs to be crawled and added to your knowledge base.
     */
    addExternal(urls: string[], options?: AddExternalContentOptions): Promise<ContentResult>;
    /**
     * Check which URLs are not yet in your knowledge base.
     */
    checkUncrawled(urls: string[]): Promise<UncrawledResult>;
}

declare class SocialResource {
    private http;
    constructor(http: HttpClient);
    /**
     * List all connected social accounts and blogs.
     */
    getConnectedAccounts(): Promise<ConnectedAccountsResult>;
    /**
     * Connect a social platform account.
     * GitHub and Beehiiv require a token.
     */
    connect(platform: SocialPlatform, handle: string, token?: string): Promise<SocialResult>;
    /**
     * Disconnect a social platform account.
     */
    disconnect(platform: SocialPlatform): Promise<SocialResult>;
    /**
     * Connect a custom blog or website.
     */
    connectBlog(url: string): Promise<SocialResult>;
    /**
     * Disconnect a custom blog or website.
     */
    disconnectBlog(url: string): Promise<SocialResult>;
}

declare class InterviewsResource {
    private http;
    constructor(http: HttpClient);
    /**
     * List active job roles across all companies.
     */
    listRoles(limit?: number): Promise<Role[]>;
    /**
     * Start a background agent interview for a role.
     * Returns immediately with status "preparing".
     */
    start(roleId: string): Promise<Interview>;
    /**
     * Stream interview events via SSE.
     * Yields event dicts; stops at terminal status.
     */
    stream(interviewId: string): AsyncGenerator<InterviewEvent>;
    /**
     * List your interviews.
     */
    list(): Promise<Interview[]>;
    /**
     * Poll interview status and stages.
     */
    getStatus(interviewId: string): Promise<Interview>;
    /**
     * Get full transcript for a completed interview.
     */
    getTranscript(interviewId: string): Promise<InterviewTranscript>;
}

declare class ChatCompletions {
    private http;
    constructor(http: HttpClient);
    create(options: ChatCompletionOptions): Promise<ChatCompletion>;
}
declare class Chat {
    readonly completions: ChatCompletions;
    constructor(http: HttpClient);
}

declare class SuperMeClient {
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
    private readonly http;
    constructor(options: SuperMeClientOptions);
    /**
     * Call any MCP tool by name with raw arguments.
     */
    mcpToolCall<T = unknown>(toolName: string, args?: Record<string, unknown>): Promise<T>;
    /**
     * List all available MCP tools.
     */
    mcpListTools(): Promise<unknown[]>;
    /**
     * Raw MCP JSON-RPC request.
     */
    rawRequest<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T>;
}

export { type AddExternalContentOptions, type AddInternalContentOptions, type AgentResponse, type AskOptions, Chat, type ChatCompletion, type ChatCompletionMessage, type ChatCompletionOptions, ChatCompletions, type ConnectedAccountsResult, ContentResource, type ContentResult, type Conversation, ConversationsResource, type FindUserResult, type GroupConverseChunk, type GroupConverseOptions, type GroupConverseResult, type Interview, type InterviewEvent, type InterviewTranscript, InterviewsResource, type Message, type PerspectiveResult, type Profile, ProfilesResource, type Role, type SocialPlatform, SocialResource, type SocialResult, SuperMeAuthError, SuperMeClient, type SuperMeClientOptions, SuperMeError, SuperMeTimeoutError, type UncrawledResult, type UpdateInternalContentOptions };
