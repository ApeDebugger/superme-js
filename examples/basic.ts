import { SuperMeClient } from "../src/index.js";

const client = new SuperMeClient({
  apiKey: process.env.SUPERME_API_KEY!,
});

// ─── Profiles ────────────────────────────────────────────────────────────────

const myProfile = await client.profiles.get();
console.log("My profile:", myProfile);

const expertProfile = await client.profiles.get("ludo");
console.log("Expert profile:", expertProfile);

const experts = await client.profiles.findByName("Shubham");
console.log("Search results:", experts);

const perspectives = await client.profiles.perspectiveSearch(
  "What are the key principles of growth marketing?"
);
console.log("Perspectives:", perspectives);

// ─── Conversations ────────────────────────────────────────────────────────────

const answer = await client.conversations.ask(
  "What is product-market fit?",
  "ludo"
);
console.log("Answer:", answer);

const agentResponse = await client.conversations.askMyAgent(
  "Summarise my recent conversations"
);
console.log("Agent:", agentResponse.response);
console.log("Conversation ID:", agentResponse.conversation_id);

// Multi-turn — pass conversation_id to continue
const followUp = await client.conversations.askMyAgent(
  "What did we just talk about?",
  { conversationId: agentResponse.conversation_id ?? undefined }
);
console.log("Follow-up:", followUp.response);

// Streaming
console.log("\nStreaming response:");
for await (const chunk of client.conversations.askMyAgentStream("Tell me something interesting")) {
  if (chunk._done) {
    console.log("\n[done] conversation_id:", chunk.conversation_id);
  } else {
    process.stdout.write(chunk.chunk ?? "");
  }
}

// Group conversation
const group = await client.conversations.groupConverse(
  ["ludo", "shubhammittal"],
  "How should a product manager think about AI adoption?",
  { maxTurns: 2 }
);
console.log("Group conversation:", group);

// ─── Content ─────────────────────────────────────────────────────────────────

const saved = await client.content.addInternal(
  "Key insight: PLG works best when the product has a viral loop built in."
);
console.log("Saved:", saved);

const crawled = await client.content.addExternal([
  "https://lethain.com/elegant-puzzle/",
]);
console.log("Queued for crawl:", crawled);

// ─── Social ───────────────────────────────────────────────────────────────────

const accounts = await client.social.getConnectedAccounts();
console.log("Connected accounts:", accounts);

// ─── OpenAI-compatible interface ──────────────────────────────────────────────

const completion = await client.chat.completions.create({
  model: "superme-agent",
  messages: [{ role: "user", content: "What is PLG?" }],
  username: "ludo",
});
console.log("Chat completion:", completion.choices[0].message.content);
console.log("Conversation ID:", completion.metadata.conversation_id);

// ─── Low-level access ─────────────────────────────────────────────────────────

const tools = await client.mcpListTools();
console.log(`Available tools (${tools.length}):`);

const rawProfile = await client.mcpToolCall("get_profile", {});
console.log("Raw tool call:", rawProfile);
