// src/types.ts
var SuperMeError = class extends Error {
  constructor(message, code, cause) {
    super(message);
    this.code = code;
    this.cause = cause;
    this.name = "SuperMeError";
  }
};
var SuperMeAuthError = class extends SuperMeError {
  constructor() {
    super("Invalid or missing API key. Get one at superme.ai/settings \u2192 API Keys.", 401);
    this.name = "SuperMeAuthError";
  }
};
var SuperMeTimeoutError = class extends SuperMeError {
  constructor() {
    super("Request timed out.");
    this.name = "SuperMeTimeoutError";
  }
};

// src/http-client.ts
var DEFAULT_MCP_BASE = "https://mcp.superme.ai";
var DEFAULT_REST_BASE = "https://www.superme.ai";
var DEFAULT_TIMEOUT = 12e4;
var HttpClient = class {
  constructor(options) {
    this.requestId = 0;
    if (!options.apiKey) {
      throw new SuperMeAuthError();
    }
    this.apiKey = options.apiKey;
    this.mcpBaseUrl = options.mcpBaseUrl ?? DEFAULT_MCP_BASE;
    this.restBaseUrl = options.restBaseUrl ?? DEFAULT_REST_BASE;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
  }
  get authHeaders() {
    return {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${this.apiKey}`
    };
  }
  // ─── Parse SSE response into structured data ────────────────────────────────
  parseSSEResponse(text) {
    const lines = text.split("\n");
    const dataLine = lines.find((l) => l.startsWith("data:"));
    if (!dataLine) {
      throw new SuperMeError("Empty or unrecognised response from SuperMe API.");
    }
    const raw = dataLine.replace(/^data:\s*/, "").trim();
    let envelope;
    try {
      envelope = JSON.parse(raw);
    } catch {
      throw new SuperMeError(`Failed to parse response: ${raw}`);
    }
    if (envelope.error) {
      if (envelope.error.code === -32001 || envelope.error.message?.toLowerCase().includes("auth")) {
        throw new SuperMeAuthError();
      }
      throw new SuperMeError(envelope.error.message, envelope.error.code);
    }
    if (!envelope.result) {
      throw new SuperMeError("No result in response.");
    }
    if (envelope.result.isError) {
      const errText = envelope.result.content?.[0]?.text ?? "Tool returned an error.";
      throw new SuperMeError(errText);
    }
    const structured = envelope.result.structuredContent?.result;
    if (structured !== void 0) {
      try {
        return JSON.parse(structured);
      } catch {
        return structured;
      }
    }
    const textContent = envelope.result.content?.[0]?.text;
    if (textContent) {
      try {
        return JSON.parse(textContent);
      } catch {
        return textContent;
      }
    }
    throw new SuperMeError("Could not extract data from response.");
  }
  // ─── Single MCP tool call ────────────────────────────────────────────────────
  async toolCall(tool, args = {}) {
    const id = ++this.requestId;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);
    try {
      const res = await fetch(this.mcpBaseUrl, {
        method: "POST",
        headers: this.authHeaders,
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "tools/call",
          params: { name: tool, arguments: args },
          id
        }),
        signal: controller.signal
      });
      if (res.status === 401 || res.status === 403) {
        throw new SuperMeAuthError();
      }
      if (!res.ok) {
        throw new SuperMeError(`HTTP ${res.status}: ${res.statusText}`);
      }
      const text = await res.text();
      return this.parseSSEResponse(text);
    } catch (err) {
      if (err.name === "AbortError") throw new SuperMeTimeoutError();
      if (err instanceof SuperMeError) throw err;
      throw new SuperMeError("Network error", void 0, err);
    } finally {
      clearTimeout(timer);
    }
  }
  // ─── Raw JSON-RPC (for mcp_list_tools, raw_request) ─────────────────────────
  async rawRequest(method, params) {
    const id = ++this.requestId;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);
    try {
      const res = await fetch(this.mcpBaseUrl, {
        method: "POST",
        headers: this.authHeaders,
        body: JSON.stringify({ jsonrpc: "2.0", method, params, id }),
        signal: controller.signal
      });
      if (res.status === 401 || res.status === 403) throw new SuperMeAuthError();
      if (!res.ok) throw new SuperMeError(`HTTP ${res.status}: ${res.statusText}`);
      const text = await res.text();
      const lines = text.split("\n");
      const dataLine = lines.find((l) => l.startsWith("data:"));
      if (!dataLine) throw new SuperMeError("Empty response.");
      const envelope = JSON.parse(dataLine.replace(/^data:\s*/, "").trim());
      if (envelope.error) throw new SuperMeError(envelope.error.message, envelope.error.code);
      return envelope.result;
    } catch (err) {
      if (err.name === "AbortError") throw new SuperMeTimeoutError();
      if (err instanceof SuperMeError) throw err;
      throw new SuperMeError("Network error", void 0, err);
    } finally {
      clearTimeout(timer);
    }
  }
  // ─── Streaming tool call ─────────────────────────────────────────────────────
  async *toolCallStream(tool, args = {}) {
    const id = ++this.requestId;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);
    try {
      const res = await fetch(this.mcpBaseUrl, {
        method: "POST",
        headers: this.authHeaders,
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "tools/call",
          params: { name: tool, arguments: args },
          id
        }),
        signal: controller.signal
      });
      if (res.status === 401 || res.status === 403) throw new SuperMeAuthError();
      if (!res.ok) throw new SuperMeError(`HTTP ${res.status}: ${res.statusText}`);
      if (!res.body) throw new SuperMeError("No response body for streaming.");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const raw = line.replace(/^data:\s*/, "").trim();
          if (!raw) continue;
          try {
            const envelope = JSON.parse(raw);
            if (envelope.error) throw new SuperMeError(envelope.error.message, envelope.error.code);
            const structured = envelope.result?.structuredContent?.result;
            if (structured) {
              try {
                yield JSON.parse(structured);
              } catch {
                yield structured;
              }
            }
          } catch (parseErr) {
            if (parseErr instanceof SuperMeError) throw parseErr;
          }
        }
      }
    } catch (err) {
      if (err.name === "AbortError") throw new SuperMeTimeoutError();
      if (err instanceof SuperMeError) throw err;
      throw new SuperMeError("Streaming error", void 0, err);
    } finally {
      clearTimeout(timer);
    }
  }
};

// src/resources/conversations.ts
var ConversationsResource = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * Ask a question to a specific user's SuperMe agent.
   */
  async ask(question, username, options = {}) {
    const result = await this.http.toolCall("ask", {
      question,
      username,
      ...options.conversationId && { conversation_id: options.conversationId },
      ...options.maxTokens && { max_tokens: options.maxTokens },
      ...options.incognito !== void 0 && { incognito: options.incognito }
    });
    return typeof result === "string" ? result : JSON.stringify(result);
  }
  /**
   * Talk to your own SuperMe AI agent.
   */
  async askMyAgent(question, options = {}) {
    return this.http.toolCall("ask_my_agent", {
      question,
      ...options.conversationId && { conversation_id: options.conversationId }
    });
  }
  /**
   * Stream your own agent's response. Yields string chunks.
   * Final item includes `{ _done: true, conversation_id }`.
   */
  async *askMyAgentStream(question, options = {}) {
    yield* this.http.toolCallStream("ask_my_agent_stream", {
      question,
      ...options.conversationId && { conversation_id: options.conversationId }
    });
  }
  /**
   * List your most recent conversations.
   */
  async list(limit = 10) {
    return this.http.toolCall("list_conversations", { limit });
  }
  /**
   * Fetch a single conversation with all its messages.
   */
  async get(conversationId) {
    return this.http.toolCall("get_conversation", {
      conversation_id: conversationId
    });
  }
  /**
   * Start or continue a multi-turn group conversation between multiple users.
   */
  async groupConverse(participants, topic, options = {}) {
    return this.http.toolCall("group_converse", {
      participants,
      topic,
      ...options.maxTurns && { max_turns: options.maxTurns },
      ...options.conversationId && { conversation_id: options.conversationId }
    });
  }
  /**
   * Stream a group conversation.
   * Yields per-perspective chunks. Final item has `{ _done: true }`.
   */
  async *groupConverseStream(participants, topic, options = {}) {
    yield* this.http.toolCallStream("group_converse_stream", {
      participants,
      topic,
      ...options.maxTurns && { max_turns: options.maxTurns },
      ...options.conversationId && { conversation_id: options.conversationId }
    });
  }
};

// src/resources/profiles.ts
var ProfilesResource = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * Get a user's public profile.
   * Omit identifier to get your own profile.
   */
  async get(identifier) {
    return this.http.toolCall(
      "get_profile",
      identifier ? { identifier } : {}
    );
  }
  /**
   * Search for users by name.
   */
  async findByName(name, limit = 5) {
    return this.http.toolCall("find_user_by_name", {
      name,
      limit
    });
  }
  /**
   * Resolve multiple names to SuperMe users in one call.
   */
  async findByNames(names, limitPerName = 3) {
    return this.http.toolCall("find_users_by_names", {
      names,
      limit_per_name: limitPerName
    });
  }
  /**
   * Get perspectives from multiple experts on a topic.
   */
  async perspectiveSearch(question) {
    return this.http.toolCall("perspective_search", {
      question
    });
  }
};

// src/resources/content.ts
var ContentResource = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * Save notes or knowledge to your personal library.
   */
  async addInternal(input, options = {}) {
    return this.http.toolCall("add_internal_content", {
      input,
      ...options.extendedContent && { extended_content: options.extendedContent },
      ...options.pastInstructions && { past_instructions: options.pastInstructions }
    });
  }
  /**
   * Update an existing note in your library.
   */
  async updateInternal(learningId, options = {}) {
    return this.http.toolCall("update_internal_content", {
      learning_id: learningId,
      ...options.userInput && { user_input: options.userInput },
      ...options.extendedContent && { extended_content: options.extendedContent },
      ...options.pastInstructions && { past_instructions: options.pastInstructions }
    });
  }
  /**
   * Submit URLs to be crawled and added to your knowledge base.
   */
  async addExternal(urls, options = {}) {
    return this.http.toolCall("add_external_content", {
      urls,
      ...options.reference && { reference: options.reference },
      ...options.instantRecrawl !== void 0 && {
        instant_recrawl: options.instantRecrawl
      }
    });
  }
  /**
   * Check which URLs are not yet in your knowledge base.
   */
  async checkUncrawled(urls) {
    return this.http.toolCall("check_uncrawled_urls", { urls });
  }
};

// src/resources/social.ts
var SocialResource = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * List all connected social accounts and blogs.
   */
  async getConnectedAccounts() {
    return this.http.toolCall("get_connected_accounts", {});
  }
  /**
   * Connect a social platform account.
   * GitHub and Beehiiv require a token.
   */
  async connect(platform, handle, token) {
    return this.http.toolCall("connect_social", {
      platform,
      handle,
      ...token && { token }
    });
  }
  /**
   * Disconnect a social platform account.
   */
  async disconnect(platform) {
    return this.http.toolCall("disconnect_social", { platform });
  }
  /**
   * Connect a custom blog or website.
   */
  async connectBlog(url) {
    return this.http.toolCall("connect_blog", { url });
  }
  /**
   * Disconnect a custom blog or website.
   */
  async disconnectBlog(url) {
    return this.http.toolCall("disconnect_blog", { url });
  }
};

// src/resources/interviews.ts
var InterviewsResource = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * List active job roles across all companies.
   */
  async listRoles(limit = 20) {
    return this.http.toolCall("list_active_roles", { limit });
  }
  /**
   * Start a background agent interview for a role.
   * Returns immediately with status "preparing".
   */
  async start(roleId) {
    return this.http.toolCall("start_interview", {
      role_id: roleId
    });
  }
  /**
   * Stream interview events via SSE.
   * Yields event dicts; stops at terminal status.
   */
  async *stream(interviewId) {
    yield* this.http.toolCallStream("stream_interview", {
      interview_id: interviewId
    });
  }
  /**
   * List your interviews.
   */
  async list() {
    return this.http.toolCall("list_my_interviews", {});
  }
  /**
   * Poll interview status and stages.
   */
  async getStatus(interviewId) {
    return this.http.toolCall("get_interview_status", {
      interview_id: interviewId
    });
  }
  /**
   * Get full transcript for a completed interview.
   */
  async getTranscript(interviewId) {
    return this.http.toolCall("get_interview_transcript", {
      interview_id: interviewId
    });
  }
};

// src/resources/chat.ts
var ChatCompletions = class {
  constructor(http) {
    this.http = http;
  }
  async create(options) {
    const lastUserMessage = [...options.messages].reverse().find((m) => m.role === "user");
    if (!lastUserMessage) {
      throw new Error("At least one user message is required.");
    }
    const response = await this.http.toolCall(options.username ? "ask" : "ask_my_agent", {
      question: lastUserMessage.content,
      ...options.username && { username: options.username },
      ...options.conversationId && { conversation_id: options.conversationId },
      ...options.maxTokens && { max_tokens: options.maxTokens }
    });
    const content = typeof response === "string" ? response : response.response ?? JSON.stringify(response);
    const conversationId = typeof response === "object" && "conversation_id" in response ? response.conversation_id : null;
    return {
      id: `superme-${Date.now()}`,
      object: "chat.completion",
      model: options.model ?? "superme-agent",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content },
          finish_reason: "stop"
        }
      ],
      metadata: { conversation_id: conversationId }
    };
  }
};
var Chat = class {
  constructor(http) {
    this.completions = new ChatCompletions(http);
  }
};

// src/client.ts
var SuperMeClient = class {
  constructor(options) {
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
  async mcpToolCall(toolName, args = {}) {
    return this.http.toolCall(toolName, args);
  }
  /**
   * List all available MCP tools.
   */
  async mcpListTools() {
    const result = await this.http.rawRequest("tools/list");
    return result.tools ?? [];
  }
  /**
   * Raw MCP JSON-RPC request.
   */
  async rawRequest(method, params) {
    return this.http.rawRequest(method, params);
  }
};
export {
  Chat,
  ChatCompletions,
  ContentResource,
  ConversationsResource,
  InterviewsResource,
  ProfilesResource,
  SocialResource,
  SuperMeAuthError,
  SuperMeClient,
  SuperMeError,
  SuperMeTimeoutError
};
