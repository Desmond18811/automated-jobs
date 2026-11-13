import Parser from 'rss-parser';
import { assertPublicUrl, USER_AGENT } from '../lib/net';
import { safeHost } from '../lib/normalize';
import { htmlToText } from '../lib/text';
import type { JobSource, RawJob } from './types';

const parser = new Parser({ timeout: 20_000, headers: { 'User-Agent': USER_AGENT } });

/** "Company: Title" (We Work Remotely) or "Title at Company" (many boards). */
function splitTitle(raw: string, creator?: string): { company: string; title: string } {
  const colon = raw.match(/^(.+?):\s+(.+)$/);
  if (colon) return { company: colon[1].trim(), title: colon[2].trim() };
  const at = raw.match(/^(.+?)\s+at\s+(.+)$/i);
  if (at) return { title: at[1].trim(), company: at[2].trim() };
  return { title: raw.trim(), company: creator?.trim() || 'Unknown' };
}

/** Generic RSS source: We Work Remotely, and MyJobMag/Jobberman if they offer feeds you are allowed to use. */
export function rssSource(feedUrl: string): JobSource {
  const host = safeHost(feedUrl);
  return {
    name: `rss:${host}`,
    async fetch(): Promise<RawJob[]> {
      await assertPublicUrl(feedUrl);
      const feed = await parser.parseURL(feedUrl);
      return (feed.items ?? [])
        .filter((i) => i.link && i.title)
        .map((i) => {
          const { company, title } = splitTitle(i.title as string, i.creator);
          return {
            source: `rss:${host}`,
            sourceId: i.guid ?? i.link,
            url: i.link as string,
            company,
            title,
            description: htmlToText(i.content ?? i.contentSnippet ?? ''),
            postedAt: i.isoDate ? new Date(i.isoDate) : undefined,
            applyUrl: i.link,
          };
        });
    },
  };
}
