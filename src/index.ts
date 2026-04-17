export { SuperMeClient } from "./client.js";

// Resources (for advanced use / type narrowing)
export { ConversationsResource } from "./resources/conversations.js";
export { ProfilesResource } from "./resources/profiles.js";
export { ContentResource } from "./resources/content.js";
export { SocialResource } from "./resources/social.js";
export { InterviewsResource } from "./resources/interviews.js";
export { Chat, ChatCompletions } from "./resources/chat.js";

// All types
export type {
  SuperMeClientOptions,
  Message,
  AskOptions,
  AgentResponse,
  Conversation,
  Profile,
  FindUserResult,
  PerspectiveResult,
  GroupConverseOptions,
  GroupConverseResult,
  GroupConverseChunk,
  AddInternalContentOptions,
  UpdateInternalContentOptions,
  AddExternalContentOptions,
  ContentResult,
  UncrawledResult,
  SocialPlatform,
  ConnectedAccountsResult,
  SocialResult,
  Role,
  Interview,
  InterviewEvent,
  InterviewTranscript,
  ChatCompletionMessage,
  ChatCompletionOptions,
  ChatCompletion,
} from "./types.js";

// Errors
export { SuperMeError, SuperMeAuthError, SuperMeTimeoutError } from "./types.js";
