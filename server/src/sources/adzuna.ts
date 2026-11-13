import { env } from '../config/env';
import { fetchJson } from '../lib/net';
import { htmlToText } from '../lib/text';
import type { JobSource, RawJob } from './types';

interface AdzunaResponse {
  results?: {
    id: string; title: string; description: string; redirect_url: string; created?: string;
    salary_min?: number; salary_max?: number;
    company?: { display_name?: string }; location?: { display_name?: string };
  }[];
}

/**
 * Adzuna search API (free key at developer.adzuna.com). One query per target role.
 * Check their country list: as far as I know Nigeria is not covered, so this is for remote/abroad searches.
 * Descriptions are snippets, so match scores for Adzuna jobs run lower.
 */
export function adzuna(roles: string[]): JobSource {
  return {
    name: 'adzuna',
    async fetch(): Promise<RawJob[]> {
      const out: RawJob[] = [];
      for (const role of roles.slice(0, 10)) {
        const qs = new URLSearchParams({
          app_id: env.ADZUNA_APP_ID,
          app_key: env.ADZUNA_APP_KEY,
          results_per_page: '50',
          what: role,
          max_days_old: '14',
          'content-type': 'application/json',
        });
        const data = await fetchJson<AdzunaResponse>(`https://api.adzuna.com/v1/api/jobs/${env.ADZUNA_COUNTRY}/search/1?${qs}`);
        for (const r of data.results ?? []) {
          out.push({
            source: 'adzuna',
            sourceId: r.id,
            url: r.redirect_url,
            company: r.company?.display_name ?? 'Unknown',
            title: htmlToText(r.title),
            location: r.location?.display_name,
            description: htmlToText(r.description),
            salary: r.salary_min || r.salary_max ? { min: r.salary_min, max: r.salary_max, period: 'year' } : null,
            postedAt: r.created ? new Date(r.created) : undefined,
            applyUrl: r.redirect_url,
          });
        }
      }
      return out;
    },
  };
}
