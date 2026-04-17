import { HttpClient } from "../http-client.js";
import { Profile, FindUserResult, PerspectiveResult } from "../types.js";

export class ProfilesResource {
  constructor(private http: HttpClient) {}

  /**
   * Get a user's public profile.
   * Omit identifier to get your own profile.
   */
  async get(identifier?: string): Promise<Profile> {
    return this.http.toolCall<Profile>(
      "get_profile",
      identifier ? { identifier } : {}
    );
  }

  /**
   * Search for users by name.
   */
  async findByName(name: string, limit = 5): Promise<FindUserResult> {
    return this.http.toolCall<FindUserResult>("find_user_by_name", {
      name,
      limit,
    });
  }

  /**
   * Resolve multiple names to SuperMe users in one call.
   */
  async findByNames(
    names: string[],
    limitPerName = 3
  ): Promise<FindUserResult> {
    return this.http.toolCall<FindUserResult>("find_users_by_names", {
      names,
      limit_per_name: limitPerName,
    });
  }

  /**
   * Get perspectives from multiple experts on a topic.
   */
  async perspectiveSearch(question: string): Promise<PerspectiveResult> {
    return this.http.toolCall<PerspectiveResult>("perspective_search", {
      question,
    });
  }
}
