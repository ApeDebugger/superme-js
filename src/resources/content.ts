import { HttpClient } from "../http-client.js";
import {
  AddInternalContentOptions,
  UpdateInternalContentOptions,
  AddExternalContentOptions,
  ContentResult,
  UncrawledResult,
} from "../types.js";

export class ContentResource {
  constructor(private http: HttpClient) {}

  /**
   * Save notes or knowledge to your personal library.
   */
  async addInternal(
    input: string,
    options: AddInternalContentOptions = {}
  ): Promise<ContentResult> {
    return this.http.toolCall<ContentResult>("add_internal_content", {
      input,
      ...(options.extendedContent && { extended_content: options.extendedContent }),
      ...(options.pastInstructions && { past_instructions: options.pastInstructions }),
    });
  }

  /**
   * Update an existing note in your library.
   */
  async updateInternal(
    learningId: string,
    options: UpdateInternalContentOptions = {}
  ): Promise<ContentResult> {
    return this.http.toolCall<ContentResult>("update_internal_content", {
      learning_id: learningId,
      ...(options.userInput && { user_input: options.userInput }),
      ...(options.extendedContent && { extended_content: options.extendedContent }),
      ...(options.pastInstructions && { past_instructions: options.pastInstructions }),
    });
  }

  /**
   * Submit URLs to be crawled and added to your knowledge base.
   */
  async addExternal(
    urls: string[],
    options: AddExternalContentOptions = {}
  ): Promise<ContentResult> {
    return this.http.toolCall<ContentResult>("add_external_content", {
      urls,
      ...(options.reference && { reference: options.reference }),
      ...(options.instantRecrawl !== undefined && {
        instant_recrawl: options.instantRecrawl,
      }),
    });
  }

  /**
   * Check which URLs are not yet in your knowledge base.
   */
  async checkUncrawled(urls: string[]): Promise<UncrawledResult> {
    return this.http.toolCall<UncrawledResult>("check_uncrawled_urls", { urls });
  }
}
