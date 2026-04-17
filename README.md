# superme-js

JavaScript/TypeScript SDK for the [SuperMe API](https://superme.ai) — ask experts, search perspectives, manage your knowledge library, and more.

> Unofficial community SDK. Built with ❤️ by [AI Garage](https://aigarage.in).

## Installation

```bash
npm install superme-js
# or
pnpm add superme-js
# or
yarn add superme-js
```

## Authentication

Get your API key at [superme.ai/settings](https://superme.ai/settings) → API Keys.

```bash
# .env or .env.local
SUPERME_API_KEY=your_api_key_here
```

## Quick Start

```typescript
import { SuperMeClient } from "superme-js";

const client = new SuperMeClient({
  apiKey: process.env.SUPERME_API_KEY!,
});

// Ask an expert a question
const answer = await client.conversations.ask(
  "What are the key principles of growth marketing?",
  "ludo"
);
console.log(answer);

// Get your own profile
const profile = await client.profiles.get();
console.log(profile.name, profile.title);

// Get expert perspectives on a topic
const perspectives = await client.profiles.perspectiveSearch(
  "How should founders think about pricing?"
);
```

## API Reference

### `new SuperMeClient(options)`

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | — | **Required.** Your SuperMe API key |
| `mcpBaseUrl` | `string` | `https://mcp.superme.ai` | MCP server URL |
| `restBaseUrl` | `string` | `https://www.superme.ai` | REST base URL |
| `timeout` | `number` | `120000` | Request timeout in ms |

---

### `client.conversations`

#### `ask(question, username, options?)`
Ask a question to a specific user's SuperMe agent.

```typescript
const answer = await client.conversations.ask(
  "What is product-market fit?",
  "ludo",
  { conversationId: "abc123" } // optional, for multi-turn
);
```

#### `askMyAgent(question, options?)`
Talk to your own SuperMe AI agent.

```typescript
const { response, conversation_id } = await client.conversations.askMyAgent(
  "Summarise my recent conversations"
);

// Continue the thread
const followUp = await client.conversations.askMyAgent(
  "Tell me more about the first one",
  { conversationId: conversation_id ?? undefined }
);
```

#### `askMyAgentStream(question, options?)`
Stream your own agent's response.

```typescript
for await (const chunk of client.conversations.askMyAgentStream("Tell me something")) {
  if (chunk._done) {
    console.log("Done. conversation_id:", chunk.conversation_id);
  } else {
    process.stdout.write(chunk.chunk ?? "");
  }
}
```

#### `list(limit?)`
List your most recent conversations.

#### `get(conversationId)`
Fetch a single conversation with all its messages.

#### `groupConverse(participants, topic, options?)`
Start or continue a multi-turn group conversation between multiple users.

```typescript
const result = await client.conversations.groupConverse(
  ["ludo", "shubhammittal"],
  "How should PMs think about AI adoption?",
  { maxTurns: 3 }
);
```

#### `groupConverseStream(participants, topic, options?)`
Stream a group conversation. Yields per-perspective chunks.

---

### `client.profiles`

#### `get(identifier?)`
Get a user's public profile. Omit `identifier` for your own profile.

#### `findByName(name, limit?)`
Search for users by name.

#### `findByNames(names, limitPerName?)`
Resolve multiple names to SuperMe users in one call.

#### `perspectiveSearch(question)`
Get perspectives from multiple experts on a topic.

---

### `client.content`

#### `addInternal(input, options?)`
Save notes or knowledge to your personal library.

#### `updateInternal(learningId, options?)`
Update an existing note.

#### `addExternal(urls, options?)`
Submit URLs to be crawled and added to your knowledge base.

#### `checkUncrawled(urls)`
Check which URLs are not yet in your knowledge base.

---

### `client.social`

#### `getConnectedAccounts()`
List connected social accounts and blogs.

#### `connect(platform, handle, token?)`
Connect a social platform. Supported: `medium`, `substack`, `x`, `instagram`, `youtube`, `beehiiv`, `google_drive`, `linkedin`, `github`, `notion`.

#### `disconnect(platform)`
Disconnect a social platform.

#### `connectBlog(url)` / `disconnectBlog(url)`
Connect or disconnect a custom blog.

---

### `client.interviews`

#### `listRoles(limit?)`
List active job roles.

#### `start(roleId)`
Start a background agent interview. Returns immediately with status `"preparing"`.

#### `stream(interviewId)`
Stream interview events via async generator.

#### `list()`
List your interviews.

#### `getStatus(interviewId)`
Poll interview status.

#### `getTranscript(interviewId)`
Get the full transcript for a completed interview.

---

### OpenAI-compatible interface

Drop-in replacement for `openai.chat.completions.create`:

```typescript
const completion = await client.chat.completions.create({
  model: "superme-agent",
  messages: [{ role: "user", content: "What is PLG?" }],
  username: "ludo", // omit to use your own agent
});

console.log(completion.choices[0].message.content);
console.log(completion.metadata.conversation_id);
```

---

### Low-level access

```typescript
// List all available MCP tools
const tools = await client.mcpListTools();

// Call any tool directly
const result = await client.mcpToolCall("get_profile", { identifier: "ludo" });

// Raw JSON-RPC
const raw = await client.rawRequest("tools/list");
```

## Error Handling

```typescript
import { SuperMeError, SuperMeAuthError, SuperMeTimeoutError } from "superme-js";

try {
  const profile = await client.profiles.get("someone");
} catch (err) {
  if (err instanceof SuperMeAuthError) {
    console.error("Check your API key.");
  } else if (err instanceof SuperMeTimeoutError) {
    console.error("Request timed out.");
  } else if (err instanceof SuperMeError) {
    console.error("SuperMe error:", err.message, err.code);
  }
}
```

## Usage in Next.js

```typescript
// lib/superme.ts
import { SuperMeClient } from "superme-js";

export const superme = new SuperMeClient({
  apiKey: process.env.SUPERME_API_KEY!,
});
```

```typescript
// app/api/ask/route.ts
import { superme } from "@/lib/superme";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { question, username } = await req.json();
  const answer = await superme.conversations.ask(question, username);
  return NextResponse.json({ answer });
}
```

## Requirements

- Node.js 18+ (uses native `fetch`)
- Works in any modern runtime: Next.js, Remix, Bun, Deno, Cloudflare Workers

## License

MIT © [AI Garage](https://aigarage.in)
