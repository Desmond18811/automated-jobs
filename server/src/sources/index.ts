import { env } from '../config/env';
import { adzuna } from './adzuna';
import { ashby, greenhouse, lever, smartrecruiters, workable } from './ats';
import { remoteOk } from './remoteok';
import { rssSource } from './rss';
import type { JobSource, SourceContext } from './types';

/**
 * Registry of automatic sources. LinkedIn, Upwork and Indeed are deliberately absent:
 * their terms prohibit scraping/automation, so jobs from them only arrive via manual add
 * and are applied to through the assisted adapter.
 */
export function buildSources(ctx: SourceContext): JobSource[] {
  const list: JobSource[] = [];
  if (env.REMOTEOK_ENABLED) list.push(remoteOk());
  for (const feed of env.RSS_FEEDS) list.push(rssSource(feed));
  if (env.ADZUNA_APP_ID && env.ADZUNA_APP_KEY && ctx.roles.length) list.push(adzuna(ctx.roles));

  const seen = new Set<string>();
  for (const page of ctx.careerPages) {
    if (!page.token || page.ats === 'unsupported') continue;
    const key = `${page.ats}:${page.token}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (page.ats === 'greenhouse') list.push(greenhouse(page.token));
    if (page.ats === 'lever') list.push(lever(page.token));
    if (page.ats === 'ashby') list.push(ashby(page.token));
    if (page.ats === 'workable') list.push(workable(page.token));
    if (page.ats === 'smartrecruiters') list.push(smartrecruiters(page.token));
  }
  return list;
}
