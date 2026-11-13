import fs from 'node:fs/promises';
import { errorMessage } from '../lib/http';
import { cvFileName } from '../services/documents/cvRenderer';
import { sendEmail } from '../services/gmail.service';
import type { AdapterResult, ChannelAdapter } from './types';

function httpStatusOf(err: unknown): number | undefined {
  const e = err as { code?: unknown; status?: unknown; response?: { status?: number } };
  if (typeof e?.response?.status === 'number') return e.response.status;
  if (typeof e?.status === 'number') return e.status;
  if (typeof e?.code === 'number') return e.code;
  return undefined;
}

export const emailAdapter: ChannelAdapter = {
  channel: 'email',
  async apply({ app, job, profile, userId }): Promise<AdapterResult> {
    const to = job.applyMethod.email;
    const docs = app.documents;
    if (!to) return { status: 'failed', error: 'This job has no application email', retryable: false };
    if (!docs?.emailSubject || !docs.emailBody) return { status: 'failed', error: 'The email has not been generated', retryable: false };

    const attachments = docs.cvPdfPath
      ? [{ filename: cvFileName(profile.fullName), mime: 'application/pdf', content: await fs.readFile(docs.cvPdfPath) }]
      : [];

    try {
      const ref = await sendEmail(userId, { to, subject: docs.emailSubject, text: docs.emailBody, attachments });
      return { status: 'sent', ref, detail: `emailed ${to}` };
    } catch (err) {
      const msg = errorMessage(err);
      const status = httpStatusOf(err);
      if (/invalid_grant|Connect Gmail first/i.test(msg) || status === 401) {
        return { status: 'needs_user', reason: 'reconnect_gmail', detail: 'Gmail access expired or was revoked. Reconnect Gmail, then retry.' };
      }
      return { status: 'failed', error: msg, retryable: status === 429 || (status !== undefined && status >= 500) };
    }
  },
};
