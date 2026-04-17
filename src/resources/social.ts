import { HttpClient } from "../http-client.js";
import {
  SocialPlatform,
  ConnectedAccountsResult,
  SocialResult,
} from "../types.js";

export class SocialResource {
  constructor(private http: HttpClient) {}

  /**
   * List all connected social accounts and blogs.
   */
  async getConnectedAccounts(): Promise<ConnectedAccountsResult> {
    return this.http.toolCall<ConnectedAccountsResult>("get_connected_accounts", {});
  }

  /**
   * Connect a social platform account.
   * GitHub and Beehiiv require a token.
   */
  async connect(
    platform: SocialPlatform,
    handle: string,
    token?: string
  ): Promise<SocialResult> {
    return this.http.toolCall<SocialResult>("connect_social", {
      platform,
      handle,
      ...(token && { token }),
    });
  }

  /**
   * Disconnect a social platform account.
   */
  async disconnect(platform: SocialPlatform): Promise<SocialResult> {
    return this.http.toolCall<SocialResult>("disconnect_social", { platform });
  }

  /**
   * Connect a custom blog or website.
   */
  async connectBlog(url: string): Promise<SocialResult> {
    return this.http.toolCall<SocialResult>("connect_blog", { url });
  }

  /**
   * Disconnect a custom blog or website.
   */
  async disconnectBlog(url: string): Promise<SocialResult> {
    return this.http.toolCall<SocialResult>("disconnect_blog", { url });
  }
}
