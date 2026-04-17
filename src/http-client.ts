import {
  SuperMeClientOptions,
  MCPResponse,
  SuperMeError,
  SuperMeAuthError,
  SuperMeTimeoutError,
} from "./types.js";

const DEFAULT_MCP_BASE = "https://mcp.superme.ai";
const DEFAULT_REST_BASE = "https://www.superme.ai";
const DEFAULT_TIMEOUT = 120_000;

export class HttpClient {
  readonly mcpBaseUrl: string;
  readonly restBaseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;
  private requestId = 0;

  constructor(options: SuperMeClientOptions) {
    if (!options.apiKey) {
      throw new SuperMeAuthError();
    }
    this.apiKey = options.apiKey;
    this.mcpBaseUrl = options.mcpBaseUrl ?? DEFAULT_MCP_BASE;
    this.restBaseUrl = options.restBaseUrl ?? DEFAULT_REST_BASE;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
  }

  private get authHeaders() {
    return {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  // ─── Parse SSE response into structured data ────────────────────────────────

  private parseSSEResponse<T>(text: string): T {
    const lines = text.split("\n");
    const dataLine = lines.find((l) => l.startsWith("data:"));

    if (!dataLine) {
      throw new SuperMeError("Empty or unrecognised response from SuperMe API.");
    }

    const raw = dataLine.replace(/^data:\s*/, "").trim();
    let envelope: MCPResponse<T>;

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

    // structuredContent.result is a JSON string — parse it
    const structured = envelope.result.structuredContent?.result;
    if (structured !== undefined) {
      try {
        return JSON.parse(structured) as T;
      } catch {
        return structured as unknown as T;
      }
    }

    // Fallback: parse text content
    const textContent = envelope.result.content?.[0]?.text;
    if (textContent) {
      try {
        return JSON.parse(textContent) as T;
      } catch {
        return textContent as unknown as T;
      }
    }

    throw new SuperMeError("Could not extract data from response.");
  }

  // ─── Single MCP tool call ────────────────────────────────────────────────────

  async toolCall<T = unknown>(tool: string, args: Record<string, unknown> = {}): Promise<T> {
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
          id,
        }),
        signal: controller.signal,
      });

      if (res.status === 401 || res.status === 403) {
        throw new SuperMeAuthError();
      }

      if (!res.ok) {
        throw new SuperMeError(`HTTP ${res.status}: ${res.statusText}`);
      }

      const text = await res.text();
      return this.parseSSEResponse<T>(text);
    } catch (err) {
      if ((err as Error).name === "AbortError") throw new SuperMeTimeoutError();
      if (err instanceof SuperMeError) throw err;
      throw new SuperMeError("Network error", undefined, err);
    } finally {
      clearTimeout(timer);
    }
  }

  // ─── Raw JSON-RPC (for mcp_list_tools, raw_request) ─────────────────────────

  async rawRequest<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
    const id = ++this.requestId;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(this.mcpBaseUrl, {
        method: "POST",
        headers: this.authHeaders,
        body: JSON.stringify({ jsonrpc: "2.0", method, params, id }),
        signal: controller.signal,
      });

      if (res.status === 401 || res.status === 403) throw new SuperMeAuthError();
      if (!res.ok) throw new SuperMeError(`HTTP ${res.status}: ${res.statusText}`);

      const text = await res.text();

      // tools/list returns result directly, not via structuredContent
      const lines = text.split("\n");
      const dataLine = lines.find((l) => l.startsWith("data:"));
      if (!dataLine) throw new SuperMeError("Empty response.");

      const envelope = JSON.parse(dataLine.replace(/^data:\s*/, "").trim());
      if (envelope.error) throw new SuperMeError(envelope.error.message, envelope.error.code);
      return envelope.result as T;
    } catch (err) {
      if ((err as Error).name === "AbortError") throw new SuperMeTimeoutError();
      if (err instanceof SuperMeError) throw err;
      throw new SuperMeError("Network error", undefined, err);
    } finally {
      clearTimeout(timer);
    }
  }

  // ─── Streaming tool call ─────────────────────────────────────────────────────

  async *toolCallStream<T = unknown>(
    tool: string,
    args: Record<string, unknown> = {}
  ): AsyncGenerator<T> {
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
          id,
        }),
        signal: controller.signal,
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
            const envelope: MCPResponse = JSON.parse(raw);
            if (envelope.error) throw new SuperMeError(envelope.error.message, envelope.error.code);

            const structured = envelope.result?.structuredContent?.result;
            if (structured) {
              try {
                yield JSON.parse(structured) as T;
              } catch {
                yield structured as unknown as T;
              }
            }
          } catch (parseErr) {
            if (parseErr instanceof SuperMeError) throw parseErr;
            // skip malformed lines
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") throw new SuperMeTimeoutError();
      if (err instanceof SuperMeError) throw err;
      throw new SuperMeError("Streaming error", undefined, err);
    } finally {
      clearTimeout(timer);
    }
  }
}
