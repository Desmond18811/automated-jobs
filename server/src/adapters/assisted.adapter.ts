import type { AdapterResult, ChannelAdapter } from './types';

const BAN_RISK: Record<string, string> = {
  linkedin: 'LinkedIn restricts accounts that use automation. JAVI never logs in or clicks for you there.',
  upwork: 'Upwork suspends accounts for automated proposals. Submit this one yourself from your own account.',
  indeed: 'Indeed does not allow automated applying. Use the draft and apply yourself.',
};

/** Platforms whose terms forbid bots: JAVI prepares everything, the human presses submit. */
export const assistedAdapter: ChannelAdapter = {
  channel: 'assisted',
  async apply({ app, job }): Promise<AdapterResult> {
    const platform = job.applyMethod.platform ?? 'this site';
    return {
      status: 'needs_user',
      reason: 'assisted_platform',
      detail: `Open the link, paste the draft, attach your tailored CV and submit. Then mark it done so JAVI can track it.`,
      payload: {
        openUrl: job.applyMethod.formUrl ?? job.url,
        platform,
        draft: app.documents?.proposal ?? app.documents?.coverLetter ?? app.documents?.emailBody,
        cvPdfPath: app.documents?.cvPdfPath,
        banRiskWarning: BAN_RISK[platform],
      },
    };
  },
};
