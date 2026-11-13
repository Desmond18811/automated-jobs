import { fetchJson } from '../lib/net';
import { htmlToText } from '../lib/text';
import type { JobSource, RawJob } from './types';

interface RemoteOkJob {
  id?: string | number; company?: string; position?: string; tags?: string[]; description?: string; location?: string;
  salary_min?: number; salary_max?: number; url?: string; apply_url?: string; date?: string;
}

/** Public JSON feed. Their terms ask you to credit Remote OK and link back, so keep `source` visible in the UI. */
export function remoteOk(): JobSource {
  return {
    name: 'remoteok',
    async fetch(): Promise<RawJob[]> {
      const data = await fetchJson<RemoteOkJob[]>('https://remoteok.com/api');
      return data
        .filter((j) => j.position && j.company && j.url)
        .map((j) => ({
          source: 'remoteok',
          sourceId: String(j.id),
          url: j.url as string,
          company: j.company as string,
          title: j.position as string,
          location: j.location || 'Remote',
          remote: true,
          description: htmlToText(j.description ?? ''),
          salary: j.salary_min || j.salary_max
            ? { min: j.salary_min || undefined, max: j.salary_max || undefined, currency: 'USD', period: 'year' as const }
            : null,
          postedAt: j.date ? new Date(j.date) : undefined,
          applyUrl: j.apply_url || j.url,
          tags: j.tags ?? [],
        }));
    },
  };
}
