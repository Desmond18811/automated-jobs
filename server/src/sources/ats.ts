import { fetchJson } from '../lib/net';
import { htmlToText } from '../lib/text';
import type { CareerPage } from '../models/profile.model';
import type { JobSource, RawJob } from './types';

/**
 * "Company career pages" without scraping: most companies host jobs on an ATS with a public JSON board.
 * Paste a careers link; if it's Greenhouse, Lever, Ashby, Workable or SmartRecruiters we read the
 * official public board API.
 */
export function detectAts(raw: string): { ats: CareerPage['ats']; token?: string } {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { ats: 'unsupported' };
  }
  const host = u.hostname.replace(/^www\./, '');
  const seg = u.pathname.split('/').filter(Boolean);
  if (/(^|\.)greenhouse\.io$/.test(host)) {
    const token = u.searchParams.get('for') ?? (seg[0] === 'embed' ? undefined : seg[0]);
    return token ? { ats: 'greenhouse', token } : { ats: 'unsupported' };
  }
  if (host === 'jobs.lever.co' && seg[0]) return { ats: 'lever', token: seg[0] };
  if (host === 'jobs.ashbyhq.com' && seg[0]) return { ats: 'ashby', token: seg[0] };
  if (host === 'apply.workable.com' && seg[0] && seg[0] !== 'api') return { ats: 'workable', token: seg[0] };
  if (/(^|\.)workable\.com$/.test(host) && host !== 'apply.workable.com' && host !== 'www.workable.com') return { ats: 'workable', token: host.split('.')[0] };
  if ((host === 'jobs.smartrecruiters.com' || host === 'careers.smartrecruiters.com') && seg[0]) return { ats: 'smartrecruiters', token: seg[0] };
  return { ats: 'unsupported' };
}

const remoteFrom = (s?: string): boolean | null => (s && /remote/i.test(s) ? true : null);

interface GhJob { id: number; title: string; absolute_url: string; location?: { name?: string }; content?: string; updated_at?: string }

export function greenhouse(token: string): JobSource {
  return {
    name: `greenhouse:${token}`,
    async fetch(): Promise<RawJob[]> {
      const base = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}`;
      const [board, data] = await Promise.all([
        fetchJson<{ name?: string }>(base).catch(() => ({ name: undefined })),
        fetchJson<{ jobs: GhJob[] }>(`${base}/jobs?content=true`),
      ]);
      return data.jobs.map((j) => ({
        source: 'greenhouse',
        sourceId: String(j.id),
        url: j.absolute_url,
        company: board.name ?? token,
        title: j.title,
        location: j.location?.name,
        remote: remoteFrom(j.location?.name),
        description: htmlToText(j.content ?? ''),
        postedAt: j.updated_at ? new Date(j.updated_at) : undefined,
        applyUrl: j.absolute_url,
      }));
    },
  };
}

interface LeverPosting {
  id: string; text: string; hostedUrl: string; applyUrl?: string; createdAt?: number; workplaceType?: string;
  descriptionPlain?: string; additionalPlain?: string; lists?: { text: string; content: string }[];
  categories?: { location?: string; commitment?: string; team?: string };
}

export function lever(token: string): JobSource {
  return {
    name: `lever:${token}`,
    async fetch(): Promise<RawJob[]> {
      const data = await fetchJson<LeverPosting[]>(`https://api.lever.co/v0/postings/${encodeURIComponent(token)}?mode=json`);
      return data.map((j) => ({
        source: 'lever',
        sourceId: j.id,
        url: j.hostedUrl,
        company: token,
        title: j.text,
        location: j.categories?.location,
        remote: j.workplaceType === 'remote' ? true : remoteFrom(j.categories?.location),
        description: [j.descriptionPlain, ...(j.lists ?? []).map((l) => `${l.text}\n${htmlToText(l.content)}`), j.additionalPlain]
          .filter(Boolean)
          .join('\n\n'),
        postedAt: j.createdAt ? new Date(j.createdAt) : undefined,
        applyUrl: j.applyUrl ?? j.hostedUrl,
      }));
    },
  };
}

interface AshbyJob { id: string; title: string; location?: string; isRemote?: boolean; descriptionPlain?: string; jobUrl: string; applyUrl?: string; publishedAt?: string }

/** Ashby's public posting API. Verify the field names against their docs before relying on it. */
export function ashby(token: string): JobSource {
  return {
    name: `ashby:${token}`,
    async fetch(): Promise<RawJob[]> {
      const data = await fetchJson<{ jobs?: AshbyJob[] }>(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(token)}`);
      return (data.jobs ?? []).map((j) => ({
        source: 'ashby',
        sourceId: j.id,
        url: j.jobUrl,
        company: token,
        title: j.title,
        location: j.location,
        remote: j.isRemote ?? remoteFrom(j.location),
        description: j.descriptionPlain ?? '',
        postedAt: j.publishedAt ? new Date(j.publishedAt) : undefined,
        applyUrl: j.applyUrl ?? j.jobUrl,
      }));
    },
  };
}

interface WorkableJob {
  title: string; shortcode: string; url: string; application_url?: string; city?: string; country?: string;
  telecommuting?: boolean; description?: string; published_on?: string; created_at?: string;
}

/** Workable's public jobs widget feed (the same one company career sites embed). */
export function workable(token: string): JobSource {
  return {
    name: `workable:${token}`,
    async fetch(): Promise<RawJob[]> {
      const data = await fetchJson<{ name?: string; jobs?: WorkableJob[] }>(
        `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(token)}?details=true`,
      );
      return (data.jobs ?? []).map((j) => {
        const location = [j.city, j.country].filter(Boolean).join(', ') || undefined;
        return {
          source: 'workable',
          sourceId: j.shortcode,
          url: j.url,
          company: data.name ?? token,
          title: j.title,
          location,
          remote: j.telecommuting ? true : remoteFrom(location),
          description: htmlToText(j.description ?? ''),
          postedAt: j.published_on || j.created_at ? new Date((j.published_on || j.created_at)!) : undefined,
          applyUrl: j.application_url ?? j.url,
        };
      });
    },
  };
}

interface SrPosting {
  id: string; name: string; releasedDate?: string; company?: { name?: string; identifier?: string };
  location?: { city?: string; country?: string; remote?: boolean; fullLocation?: string };
}
interface SrDetail { jobAd?: { sections?: Record<string, { title?: string; text?: string }> }; postingUrl?: string; applyUrl?: string }

/** SmartRecruiters' public posting API. Descriptions need one request per posting, so at most 30. */
export function smartrecruiters(token: string): JobSource {
  return {
    name: `smartrecruiters:${token}`,
    async fetch(): Promise<RawJob[]> {
      const base = `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(token)}/postings`;
      const list = await fetchJson<{ content?: SrPosting[] }>(`${base}?limit=30`);
      const out: RawJob[] = [];
      for (const p of (list.content ?? []).slice(0, 30)) {
        const d = await fetchJson<SrDetail>(`${base}/${encodeURIComponent(p.id)}`).catch(() => ({}) as SrDetail);
        const sections = Object.values(d.jobAd?.sections ?? {});
        const location = p.location?.fullLocation ?? ([p.location?.city, p.location?.country].filter(Boolean).join(', ') || undefined);
        const url = d.postingUrl ?? `https://jobs.smartrecruiters.com/${encodeURIComponent(token)}/${encodeURIComponent(p.id)}`;
        out.push({
          source: 'smartrecruiters',
          sourceId: p.id,
          url,
          company: p.company?.name ?? token,
          title: p.name,
          location,
          remote: p.location?.remote ? true : remoteFrom(location),
          description: sections.map((s) => `${s.title ?? ''}\n${htmlToText(s.text ?? '')}`).join('\n\n'),
          postedAt: p.releasedDate ? new Date(p.releasedDate) : undefined,
          applyUrl: d.applyUrl ?? url,
        });
      }
      return out;
    },
  };
}
