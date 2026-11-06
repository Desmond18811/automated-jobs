import crypto from 'node:crypto';
import type { Lead, Job } from '../types.js';
import type { RawMaterial } from './read.js';
import { normalizeUrl, normalizeTitle } from '../store.js';
import {
  extractPostings,
  classifyLinks,
  type Posting,
  type ClassifyLinkItem
} from '../ai.js';

const KNOWN_ATS_DOMAINS = [
  'greenhouse.io',
  'lever.co',
  'ashbyhq.com',
  'workable.com',
  'myworkdayjobs.com',
  'smartrecruiters.com',
  'bamboohr.com',
  'recruitee.com',
  'teamtailor.com',
  'jobvite.com',
  'icims.com',
  'breezy.hr',
  'zohorecruit.com',
  'applytojob.com'
];

const SOCIAL_OR_NOT_JOB_DOMAINS = [
  'facebook.com',
  'instagram.com',
  'x.com',
  'twitter.com',
  'youtube.com',
  'youtu.be',
  'tiktok.com',
  't.me',
  'wa.me',
  'whatsapp.com',
  'chat.whatsapp.com'
];

export function classifyUrl(rawUrl: string): 'job' | 'maybe' | 'not-job' {
  const norm = normalizeUrl(rawUrl);

  try {
    const u = new URL(norm);
    const scheme = u.protocol.toLowerCase();

    // 1. Not-job: schemes
    if (scheme === 'mailto:' || scheme === 'tel:' || scheme === 'javascript:') {
      return 'not-job';
    }

    const host = u.hostname.toLowerCase();
    const pathname = u.pathname;

    // Not-job: social / messaging / linkedin profile/company
    if (
      SOCIAL_OR_NOT_JOB_DOMAINS.some((d) => host === d || host.endsWith('.' + d))
    ) {
      return 'not-job';
    }

    if (
      (host === 'linkedin.com' || host.endsWith('.linkedin.com')) &&
      (pathname.startsWith('/in/') || pathname.startsWith('/company/'))
    ) {
      return 'not-job';
    }

    // Not-job: path matches privacy/login/etc
    if (
      /\/unsubscribe|privacy|terms|cookie|login|signin|sign-in|signup|register|password/i.test(
        pathname
      )
    ) {
      return 'not-job';
    }

    // Not-job: asset file
    if (
      /\.(png|jpg|jpeg|gif|svg|webp|css|js|ico|woff)(\?.*)?$/i.test(pathname)
    ) {
      return 'not-job';
    }

    // Not-job: site root with no path
    if (
      (pathname === '/' || pathname === '') &&
      u.search === '' &&
      u.hash === ''
    ) {
      return 'not-job';
    }

    // 2. Job: ATS hosts
    if (KNOWN_ATS_DOMAINS.some((d) => host === d || host.endsWith('.' + d))) {
      return 'job';
    }

    // Job: job-board detail page
    const fullHref = host + pathname;
    if (
      fullHref.includes('jobberman.com/listings/') ||
      fullHref.includes('myjobmag.com/job/') ||
      (fullHref.includes('indeed.com') &&
        (pathname.includes('/viewjob') || pathname.includes('/rc/clk'))) ||
      (fullHref.includes('linkedin.com') && pathname.includes('/jobs/view/')) ||
      fullHref.includes('hotnigerianjobs.com/hotjobs/')
    ) {
      return 'job';
    }

    // Job: path segment followed by another segment or job id query
    const segments = pathname.split('/').filter(Boolean);
    const jobSegmentRegex =
      /^(job|jobs|career|careers|vacancy|vacancies|position|positions|opening|openings|opportunit|apply|recruitment)/i;

    for (let i = 0; i < segments.length; i++) {
      if (jobSegmentRegex.test(segments[i])) {
        // Followed by at least one more path segment
        if (i < segments.length - 1) {
          return 'job';
        }
        // Or followed by job-id query parameter
        if (
          u.searchParams.has('gh_jid') ||
          u.searchParams.has('jobId') ||
          u.searchParams.has('job_id') ||
          u.searchParams.has('id')
        ) {
          return 'job';
        }
      }
    }

    return 'maybe';
  } catch {
    return 'not-job';
  }
}

function extractSnippet(text: string, match: string, length = 200): string {
  const idx = text.indexOf(match);
  if (idx === -1) return match.slice(0, length);
  const start = Math.max(0, idx - Math.floor((length - match.length) / 2));
  const snippet = text.slice(start, start + length).replace(/\s+/g, ' ').trim();
  return snippet.slice(0, 300);
}

export async function buildLeads(params: {
  materials: RawMaterial[];
  existingJobs: Job[];
}): Promise<{ leads: Lead[]; warnings: string[] }> {
  const leads: Lead[] = [];
  const warnings: string[] = [];
  const aiKey =
    process.env.DEEPSEEK_API_KEY || process.env.ANTHROPIC_API_KEY;

  for (const mat of params.materials) {
    // 1. Spreadsheet rows
    if (mat.rows && mat.rows.length > 0) {
      let noLinkOrEmailCount = 0;

      for (const row of mat.rows) {
        let url: string | undefined;
        let email: string | undefined;
        let title: string | undefined;
        let company: string | undefined;
        let location: string | undefined;
        let deadline: string | undefined;

        // Find URL & Title & Company & Location & Deadline from headers
        for (const [k, v] of Object.entries(row)) {
          if (/link|url|apply|application/i.test(k)) {
            if (!url) url = v;
          }
          if (/title|role|position|job|vacancy/i.test(k)) {
            if (!title) title = v;
          }
          if (/company|organi[sz]ation|employer/i.test(k)) {
            if (!company) company = v;
          }
          if (/location|city|state/i.test(k)) {
            if (!location) location = v;
          }
          if (/deadline|closing|close date|apply by/i.test(k)) {
            if (!deadline) deadline = v;
          }

          // Check if value is email
          const emailMatch = v.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/);
          if (emailMatch && !email) {
            email = emailMatch[0];
          }

          // Check if value is url
          const urlMatch = v.match(/https?:\/\/[^\s<>"'`)\]]+/);
          if (urlMatch && !url) {
            url = urlMatch[0].replace(/[.,;:!?)]+$/, '');
          }
        }

        if (url) {
          leads.push({
            id: crypto.randomUUID(),
            kind: 'url',
            url,
            title,
            company,
            location,
            deadline,
            snippet: Object.entries(row)
              .map(([k, val]) => `${k}: ${val}`)
              .join('; ')
              .slice(0, 300),
            source: mat.source,
            verdict: 'job', // Trust user-listed spreadsheet row
            selected: true
          });
        } else if (email) {
          leads.push({
            id: crypto.randomUUID(),
            kind: 'email',
            email,
            title,
            company,
            location,
            deadline,
            snippet: Object.entries(row)
              .map(([k, val]) => `${k}: ${val}`)
              .join('; ')
              .slice(0, 300),
            source: mat.source,
            verdict: 'job',
            selected: true
          });
        } else {
          noLinkOrEmailCount++;
        }
      }

      if (noLinkOrEmailCount > 0) {
        warnings.push(`Rows without a link or email: ${noLinkOrEmailCount}`);
      }
      continue;
    }

    // 2. Documents and text (no rows)
    // Links
    for (const link of mat.links) {
      const v = classifyUrl(link.url);
      let title: string | undefined;
      if (link.text && link.text.length > 3) {
        const lower = link.text.toLowerCase().trim();
        if (lower !== 'click here' && lower !== 'apply') {
          title = link.text;
        }
      }

      const snippet = mat.text
        ? extractSnippet(mat.text, link.url, 200)
        : link.text || link.url;

      leads.push({
        id: crypto.randomUUID(),
        kind: 'url',
        url: link.url,
        title,
        snippet: snippet.slice(0, 300),
        source: mat.source,
        verdict: v,
        selected: v === 'job'
      });
    }

    // Emails with apply context
    if (mat.text) {
      const emailRegex = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;
      let emMatch: RegExpExecArray | null;
      while ((emMatch = emailRegex.exec(mat.text)) !== null) {
        const email = emMatch[0];
        const idx = emMatch.index;

        // Apply context: cv|cvs|resume|application|apply|send within 250 chars before or 60 after
        const before = mat.text.slice(Math.max(0, idx - 250), idx);
        const after = mat.text.slice(idx + email.length, idx + email.length + 60);
        const hasApplyContext =
          /\b(cv|cvs|resume|application|apply|send)\b/i.test(before) ||
          /\b(cv|cvs|resume|application|apply|send)\b/i.test(after);

        if (hasApplyContext) {
          // subjectHint: within 300 chars of email
          const surrounding = mat.text.slice(
            Math.max(0, idx - 300),
            Math.min(mat.text.length, idx + 300)
          );

          let subjectHint: string | undefined;
          const quotedMatch = surrounding.match(
            /subject(?: line)?[^"“'\n]{0,40}["“']([^"”'\n]{3,80})["”']/i
          );
          if (quotedMatch) {
            subjectHint = quotedMatch[1];
          } else if (
            /(?:use|using) (?:the )?(job title|position|role)(?: applied for)? as (?:the )?subject/i.test(
              surrounding
            )
          ) {
            subjectHint = '<job title>';
          }

          const snippet = extractSnippet(mat.text, email, 200);

          leads.push({
            id: crypto.randomUUID(),
            kind: 'email',
            email,
            subjectHint,
            snippet: snippet.slice(0, 300),
            source: mat.source,
            verdict: 'job',
            selected: true
          });
        }
      }
    }

    // 3. AI extraction pass (when AI key is set)
    if (aiKey && (mat.text || mat.visual)) {
      try {
        const postings: Posting[] = await extractPostings({
          text: mat.text,
          visual: mat.visual,
          source: mat.source
        });

        for (const post of postings) {
          // Anti-invention check
          if (!mat.visual) {
            let valid = false;
            if (post.applyUrl) {
              const normPostUrl = normalizeUrl(post.applyUrl);
              const foundInMat =
                (mat.text && mat.text.includes(post.applyUrl)) ||
                mat.links.some((l) => normalizeUrl(l.url) === normPostUrl);
              if (foundInMat) {
                valid = true;
              } else {
                warnings.push(
                  `Ignored an address Claude reported that isn't in ${mat.source}.`
                );
                post.applyUrl = undefined;
              }
            }
            if (post.applyEmail) {
              const lowerPostEmail = post.applyEmail.toLowerCase();
              const foundInMat =
                mat.text && mat.text.toLowerCase().includes(lowerPostEmail);
              if (foundInMat) {
                valid = true;
              } else {
                warnings.push(
                  `Ignored an address Claude reported that isn't in ${mat.source}.`
                );
                post.applyEmail = undefined;
              }
            }
          }

          // Match against existing leads or create new
          let matched = false;
          if (post.applyUrl) {
            const normPostUrl = normalizeUrl(post.applyUrl);
            const l = leads.find(
              (x) => x.url && normalizeUrl(x.url) === normPostUrl
            );
            if (l) {
              matched = true;
              if (post.title) l.title = post.title;
              if (post.company) l.company = post.company;
              if (post.location) l.location = post.location;
              if (post.deadline) l.deadline = post.deadline;
              if (post.subjectInstruction)
                l.subjectHint = post.subjectInstruction;
              if (post.summary) l.postingText = post.summary;
              if (mat.visual) {
                l.note = 'Read from an image. Check the address before applying.';
              }
            }
          }

          if (!matched && post.applyEmail) {
            const lowerPostEmail = post.applyEmail.toLowerCase();
            const l = leads.find(
              (x) => x.email && x.email.toLowerCase() === lowerPostEmail
            );
            if (l) {
              matched = true;
              if (post.title) l.title = post.title;
              if (post.company) l.company = post.company;
              if (post.location) l.location = post.location;
              if (post.deadline) l.deadline = post.deadline;
              if (post.subjectInstruction)
                l.subjectHint = post.subjectInstruction;
              if (post.summary) l.postingText = post.summary;
              if (mat.visual) {
                l.note = 'Read from an image. Check the address before applying.';
              }
            }
          }

          // If no matching lead, but has applyUrl or applyEmail
          if (!matched && (post.applyUrl || post.applyEmail)) {
            leads.push({
              id: crypto.randomUUID(),
              kind: post.applyUrl ? 'url' : 'email',
              url: post.applyUrl,
              email: post.applyEmail,
              title: post.title,
              company: post.company,
              location: post.location,
              deadline: post.deadline,
              subjectHint: post.subjectInstruction,
              postingText: post.summary,
              snippet: (post.summary || post.howToApply || '').slice(0, 300),
              source: mat.source,
              verdict: 'job',
              note: mat.visual
                ? 'Read from an image. Check the address before applying.'
                : undefined,
              selected: true
            });
          } else if (!matched && !post.applyUrl && !post.applyEmail) {
            // Instructions only posting
            leads.push({
              id: crypto.randomUUID(),
              kind: 'instructions',
              title: post.title,
              company: post.company,
              location: post.location,
              deadline: post.deadline,
              snippet: (
                post.howToApply ||
                post.summary ||
                'Apply instructions'
              ).slice(0, 300),
              source: mat.source,
              verdict: 'job',
              selected: false
            });
          }
        }
      } catch (err: any) {
        warnings.push(`Claude couldn't read ${mat.source}: ${err?.message || err}`);
      }
    }
  }

  // 4. Classify remaining 'maybe' URLs with AI
  if (aiKey) {
    const maybeLeads = leads.filter(
      (l) => l.kind === 'url' && l.verdict === 'maybe' && l.url
    );
    if (maybeLeads.length > 0) {
      const itemsToClassify: ClassifyLinkItem[] = maybeLeads
        .slice(0, 200)
        .map((l, index) => ({
          i: index,
          url: l.url!,
          text: l.title,
          snippet: l.snippet
        }));

      try {
        const classified = await classifyLinks(itemsToClassify);
        for (const res of classified) {
          const lead = maybeLeads[res.i];
          if (lead) {
            lead.verdict = res.isJob ? 'job' : 'not-job';
            lead.selected = res.isJob;
            if (res.reason) lead.note = res.reason;
          }
        }
      } catch (err: any) {
        warnings.push(`Link classification failed: ${err?.message || err}`);
      }
    }
  }

  // 5. De-duplicate within the batch and against the queue
  const uniqueBatchLeads: Lead[] = [];
  for (const lead of leads) {
    let duplicateOf: string | undefined;

    // Check duplicate against existing queue
    if (lead.kind === 'url' && lead.url) {
      const norm = normalizeUrl(lead.url);
      const queueMatch = params.existingJobs.find(
        (j) => j.kind === 'form' && j.url && normalizeUrl(j.url) === norm
      );
      if (queueMatch) {
        duplicateOf = queueMatch.id;
      } else {
        // Check duplicate within batch
        const batchMatch = uniqueBatchLeads.find(
          (b) => b.kind === 'url' && b.url && normalizeUrl(b.url) === norm
        );
        if (batchMatch) {
          duplicateOf = batchMatch.id;
        }
      }
    } else if (lead.kind === 'email' && lead.email) {
      const normEmail = lead.email.toLowerCase().trim();
      const normTitle = normalizeTitle(lead.title || '');
      const queueMatch = params.existingJobs.find(
        (j) =>
          j.kind === 'email' &&
          (j.applyEmail || '').toLowerCase().trim() === normEmail &&
          normalizeTitle(j.title || '') === normTitle
      );
      if (queueMatch) {
        duplicateOf = queueMatch.id;
      } else {
        const batchMatch = uniqueBatchLeads.find(
          (b) =>
            b.kind === 'email' &&
            (b.email || '').toLowerCase().trim() === normEmail &&
            normalizeTitle(b.title || '') === normTitle
        );
        if (batchMatch) {
          duplicateOf = batchMatch.id;
        }
      }
    }

    if (duplicateOf) {
      lead.duplicateOf = duplicateOf;
      lead.selected = false;
    } else {
      lead.selected =
        (lead.verdict === 'job' || lead.kind === 'email') &&
        lead.kind !== 'instructions';
    }

    uniqueBatchLeads.push(lead);
  }

  return { leads: uniqueBatchLeads, warnings };
}
