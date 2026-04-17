import { HttpClient } from "../http-client.js";
import {
  Role,
  Interview,
  InterviewEvent,
  InterviewTranscript,
} from "../types.js";

export class InterviewsResource {
  constructor(private http: HttpClient) {}

  /**
   * List active job roles across all companies.
   */
  async listRoles(limit = 20): Promise<Role[]> {
    return this.http.toolCall<Role[]>("list_active_roles", { limit });
  }

  /**
   * Start a background agent interview for a role.
   * Returns immediately with status "preparing".
   */
  async start(roleId: string): Promise<Interview> {
    return this.http.toolCall<Interview>("start_interview", {
      role_id: roleId,
    });
  }

  /**
   * Stream interview events via SSE.
   * Yields event dicts; stops at terminal status.
   */
  async *stream(interviewId: string): AsyncGenerator<InterviewEvent> {
    yield* this.http.toolCallStream<InterviewEvent>("stream_interview", {
      interview_id: interviewId,
    });
  }

  /**
   * List your interviews.
   */
  async list(): Promise<Interview[]> {
    return this.http.toolCall<Interview[]>("list_my_interviews", {});
  }

  /**
   * Poll interview status and stages.
   */
  async getStatus(interviewId: string): Promise<Interview> {
    return this.http.toolCall<Interview>("get_interview_status", {
      interview_id: interviewId,
    });
  }

  /**
   * Get full transcript for a completed interview.
   */
  async getTranscript(interviewId: string): Promise<InterviewTranscript> {
    return this.http.toolCall<InterviewTranscript>("get_interview_transcript", {
      interview_id: interviewId,
    });
  }
}
