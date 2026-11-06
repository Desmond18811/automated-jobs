import crypto from 'node:crypto';
import { chromium, type Page, type Browser } from 'playwright';
import type { Lead } from '../types.js';
import { classifyUrl } from './leads.js';
import { normalizeUrl } from '../store.js';

interface RawLink {
  href: string;
  text: string;
  rel?: string;
}

export async function scanListing(
  target: string | Page
): Promise<{ leads: Lead[]; warnings: string[] }> {
  let page: Page;
  let browserToClose: Browser | null = null;
  const warnings: string[] = [];
  const leads: Lead[] = [];

  const initialUrl = typeof target === 'string' ? target : target.url();

  if (typeof target === 'string') {
    try {
      browserToClose = await chromium.launch({ headless: true });
      page = await browserToClose.newPage();
    } catch (err: any) {
      return {
        leads: [],
        warnings: [`Couldn't open ${initialUrl}: ${err?.message || err}`]
      };
    }
  } else {
    page = target;
  }

  try {
    let currentUrl = initialUrl;
    let pagesFollowed = 0;
    const collectedLinks: RawLink[] = [];

    // Helper: collect links from current page/frames
    const collectFromCurrentPage = async (): Promise<void> => {
      const frames = page.frames();
      for (const frame of frames) {
        try {
          const frameLinks = await frame.evaluate(`
            (() => {
              const results = [];
              const anchors = document.querySelectorAll('a[href]');
              for (const a of anchors) {
                const href = a.href;
                const text = (a.innerText || a.textContent || '').trim();
                const rel = a.getAttribute('rel') || '';
                if (
                  href &&
                  (href.startsWith('http://') ||
                    href.startsWith('https://') ||
                    href.startsWith('file://'))
                ) {
                  results.push({ href, text, rel });
                }
              }
              return results;
            })()
          `) as RawLink[];
          collectedLinks.push(...frameLinks);
        } catch {
          // Frame navigation or cross-origin access error, ignore
        }
      }
    };

    while (pagesFollowed < 3) {
      if (typeof target === 'string' || pagesFollowed > 0) {
        try {
          await page.goto(currentUrl, {
            timeout: 45_000,
            waitUntil: 'domcontentloaded'
          });
        } catch (err: any) {
          warnings.push(`Couldn't open ${currentUrl}: ${err?.message || err}`);
          break;
        }
      }

      // Settle and scroll to bottom 3 times with 800 ms pauses
      for (let i = 0; i < 3; i++) {
        await page
          .evaluate('(() => { window.scrollTo(0, document.body.scrollHeight); })()')
          .catch(() => {});
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      await collectFromCurrentPage();
      pagesFollowed++;

      if (pagesFollowed >= 3) break;

      // Look for next page link
      let nextUrl: string | null = null;
      try {
        nextUrl = await page.evaluate(`
          (() => {
            const anchors = Array.from(document.querySelectorAll('a[href]'));
            // 1. rel="next"
            const relNext = anchors.find(a => (a.getAttribute('rel') || '').toLowerCase() === 'next');
            if (relNext && relNext.href) return relNext.href;

            // 2. text matching /^(next|next page|›|»|>)$/i
            const textNext = anchors.find(a => {
              const t = (a.innerText || a.textContent || '').trim();
              return /^(next|next page|›|»|>)$/i.test(t);
            });
            if (textNext && textNext.href) return textNext.href;

            return null;
          })()
        `) as string | null;
      } catch {
        nextUrl = null;
      }

      if (!nextUrl || nextUrl === currentUrl) {
        break;
      }
      currentUrl = nextUrl;
    }

    // Filter and build leads
    const listingU = new URL(initialUrl);
    const listingHost = listingU.hostname.toLowerCase();
    const listingPath = listingU.pathname.replace(/\/$/, '');

    const seenUrls = new Set<string>();

    for (const link of collectedLinks) {
      if (leads.length >= 300) break;

      const normUrl = normalizeUrl(link.href);
      if (seenUrls.has(normUrl)) continue;
      seenUrls.add(normUrl);

      const verdict = classifyUrl(link.href);
      let keep = false;

      if (verdict === 'job') {
        keep = true;
      } else if (verdict === 'maybe') {
        try {
          const u = new URL(normUrl);
          if (u.hostname.toLowerCase() === listingHost) {
            const p = u.pathname.replace(/\/$/, '');
            // path is deeper than listing page's own path
            if (p.startsWith(listingPath) && p.length > listingPath.length) {
              keep = true;
            }
          }
        } catch {
          // ignore
        }
      }

      if (keep) {
        leads.push({
          id: crypto.randomUUID(),
          kind: 'url',
          url: link.href,
          title: link.text && link.text.length > 3 ? link.text : undefined,
          snippet: link.text || link.href,
          source: initialUrl,
          verdict: verdict === 'job' ? 'job' : 'maybe',
          selected: verdict === 'job'
        });
      }
    }
  } finally {
    if (browserToClose) {
      await browserToClose.close().catch(() => {});
    }
  }

  return { leads, warnings };
}
