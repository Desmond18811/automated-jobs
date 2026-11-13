import type { ApplicationDoc, Channel } from '../models/application.model';
import type { JobPostDoc } from '../models/jobPost.model';
import type { ProfileDoc } from '../models/profile.model';
import type { NeedsReason, TaskQuestion } from '../models/task.model';

/** Every adapter returns exactly one of: sent, needs_user, failed. */
export type AdapterResult =
  | { status: 'sent'; ref?: { messageId?: string; threadId?: string }; screenshotPath?: string; detail?: string }
  | { status: 'needs_user'; reason: NeedsReason; detail: string; questions?: TaskQuestion[]; payload?: Record<string, unknown> }
  | { status: 'failed'; error: string; retryable: boolean };

export interface ApplyContext {
  userId: string;
  app: ApplicationDoc;
  job: JobPostDoc;
  profile: ProfileDoc;
  /** One-off answers the user gave for this specific application (e.g. salary). */
  extraAnswers: Record<string, string>;
}

export interface ChannelAdapter {
  channel: Channel;
  apply(ctx: ApplyContext): Promise<AdapterResult>;
}
