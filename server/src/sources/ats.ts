import { fetchJson } from '../lib/net';
import { htmlToText } from '../lib/text';
import type { CareerPage } from '../models/profile.model';
import type { JobSource, RawJob } from './types';

/**
 * "Company career pages" without scraping: most companies host jobs on an ATS with a public JSON board.
 * Paste a careers link; if it's Greenhouse, Lever or Ashby we read the official board API.
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
