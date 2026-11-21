import type { Job } from 'bullmq';
import { logger } from '../lib/logger';
import { Application } from '../models/application.model';
import { transition } from '../services/stateMachine';
import { generateDocuments } from '../services/documents/generators';
import { JobPost } from '../models/jobPost.model';
import { notify } from '../services/notification.service';
import { Profile } from '../models/profile.model';
import { enqueueDelivery } from '../queues';
import { MIN_REVIEWED_FOR_AUTO, userApprovalCount } from '../services/safety.service';

export async function generateProcessor(job: Job<{ applicationId: string }>) {
  const app = await Application.findById(job.data.applicationId);
  if (!app || !['matched', 'drafted'].includes(app.status)) return { skipped: app?.status ?? 'missing' };
  const [post, profile] = await Promise.all([JobPost.findById(app.jobId), Profile.findOne({ userId: app.userId })]);
  if (!post || !profile) return { skipped: 'missing job or profile' };
  if (profile.status !== 'verified') return { skipped: 'profile not verified' };

  const userId = String(app.userId);
  const docs = await generateDocuments(profile, post, app.channel, `${userId}-${app.id}`);
  app.documents = { ...docs, editedByUser: false, generatedAt: new Date() };
  await transition(app, 'drafted', 'documents generated');

  const { rules } = profile;
  // Second line of defence: even if 'auto' got stored somehow, it only counts after 10 user approvals.
  const autoOk =
    rules.approvalMode === 'auto' &&
    (await userApprovalCount(userId)) >= MIN_REVIEWED_FOR_AUTO &&
    app.channel !== 'assisted' &&
    app.score >= rules.autoApproveMinScore &&
    docs.factCheck.passed &&
    docs.factCheck.warnings.length === 0 &&
    app.filterNotes.length === 0;

  if (autoOk) {
    await transition(app, 'approved', 'auto-approved');
    await enqueueDelivery({ id: app.id, channel: app.channel });
    return { autoApproved: true };
  }

  await notify(userId, docs.factCheck.passed
    ? { type: 'draft_ready', title: `Draft ready: ${post.title} at ${post.company}`, body: 'Review and approve when you are happy with it.', data: { applicationId: app.id } }
    : { type: 'draft_needs_attention', title: `Check this draft: ${post.title}`, body: docs.factCheck.blocking.join(' '), data: { applicationId: app.id } });
  logger.debug({ applicationId: app.id, factCheck: docs.factCheck }, 'draft generated');
  return { drafted: true };
}
