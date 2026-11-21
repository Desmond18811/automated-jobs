import { env } from '../../config/env';
import { fetchText } from '../../lib/net';
import type { AuditFinding, IBusinessLead, LeadAudit } from '../../models/businessLead.model';
import { verticalSpec } from './catalog';

/**
 * A free, specific audit: every finding is something the owner can check in under a minute
 * (open the site on a phone, look for an order button), with the evidence JAVI saw.
 * Nothing is inferred from a missing fetch except "we couldn't open it".
 */

const ORDER_RE = /add to cart|checkout|order (online|now)|place (an |your )?order|paystack|flutterwave|chowdeck|glovo|shopify|woocommerce|\/cart\b/i;
const BOOK_RE = /book (now|online|an appointment)|appointment|calendly|fresha|booksy|setmore|reservation|reserve a table/i;
const WA_RE = /wa\.me\/|api\.whatsapp\.com|whatsapp:\/\/|chat\.whatsapp\.com/i;
const SOCIAL: Array<[string, RegExp]> = [
  ['Instagram', /instagram\.com\/[a-z0-9_.]+/i],
  ['Facebook', /facebook\.com\/[a-z0-9_.-]+/i],
  ['TikTok', /tiktok\.com\/@[a-z0-9_.]+/i],
  ['X/Twitter', /(twitter|x)\.com\/[a-z0-9_]+/i],
];

const withScheme = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u.replace(/^\/+/, '')}`);

async function tryFetch(url: string): Promise<{ html: string; url: string } | null> {
  try {
    return { html: await fetchText(url), url };
  } catch {
    return null;
  }
}

async function pageSpeed(url: string): Promise<number | null> {
  if (!env.PAGESPEED_API_KEY) return null;
  try {
    const api = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=performance&key=${env.PAGESPEED_API_KEY}`;
    const res = await fetch(api, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) return null;
    const data: any = await res.json();
    const score = data?.lighthouseResult?.categories?.performance?.score;
    return typeof score === 'number' ? Math.round(score * 100) : null;
  } catch {
    return null;
  }
}

export async function auditLead(lead: Pick<IBusinessLead, 'name' | 'vertical' | 'website' | 'contacts'>): Promise<LeadAudit> {
  const findings: AuditFinding[] = [];
  const signals: Record<string, unknown> = {};
  const spec = verticalSpec(lead.vertical);
  const primary = spec?.primaryOffer;

  if (!lead.website) {
    findings.push({
      id: 'no_website_listed',
      title: `We couldn't find a website listed for ${lead.name}`,
      evidence: 'No website on the business listing JAVI found it from.',
      howToCheck: `Search “${lead.name}” on Google Maps and see whether a website shows on the listing.`,
      severity: 'high',
      offer: primary ?? 'website',
    });
    const hasWa = lead.contacts.some((c) => c.kind === 'whatsapp' || c.kind === 'phone');
    signals.hasPhone = hasWa;
    return { ranAt: new Date(), findings, signals };
  }

  const base = withScheme(lead.website);
  const https = base.replace(/^http:/i, 'https:');
  let page = await tryFetch(https);
  let onHttps = Boolean(page);
  if (!page) {
    page = await tryFetch(https.replace(/^https:/i, 'http:'));
    onHttps = false;
  }
  if (!page) {
    findings.push({
      id: 'site_unreachable',
      title: 'The website listed for this business did not open',
      evidence: `${base} did not load when JAVI tried it.`,
      howToCheck: `Open ${base} on your phone.`,
      severity: 'high',
      offer: primary ?? 'website',
    });
    return { ranAt: new Date(), url: base, reachable: false, findings, signals };
  }

  const html = page.html;
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ');
  signals.bytes = html.length;
  signals.https = onHttps;
  signals.viewport = /<meta[^>]+name=["']viewport["']/i.test(html);
  signals.ordering = ORDER_RE.test(html);
  signals.booking = BOOK_RE.test(html);
  signals.whatsapp = WA_RE.test(html);
  signals.socials = SOCIAL.filter(([, re]) => re.test(html)).map(([n]) => n);
  const years = [...text.matchAll(/(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(20\d{2})/gi)].map((m) => Number(m[1]));
  signals.copyrightYear = years.length ? Math.max(...years) : undefined;

  if (!onHttps) {
    findings.push({
      id: 'no_https',
      title: 'The site opens without the padlock (not secure)',
      evidence: `${page.url} only loaded over http://`,
      howToCheck: 'Open the site in Chrome on your phone and look for “Not secure” next to the address.',
      severity: 'medium',
      offer: 'website',
    });
  }
  if (!signals.viewport) {
    findings.push({
      id: 'not_mobile',
      title: 'The site is not set up for phones',
      evidence: 'The page has no mobile “viewport” setting, so phones show the desktop layout shrunk down.',
      howToCheck: 'Open the site on your phone: you will need to pinch and zoom to read it.',
      severity: 'high',
      offer: 'website',
    });
  }
  if ((spec?.id === 'restaurant' || spec?.id === 'shop') && !signals.ordering) {
    findings.push({
      id: 'no_online_ordering',
      title: 'Customers cannot order or pay on the site',
      evidence: 'No cart, checkout or order button was found on the homepage.',
      howToCheck: 'Open the site and try to place an order without calling or messaging.',
      severity: 'high',
      offer: 'ordering',
    });
  }
  if ((spec?.id === 'salon' || spec?.id === 'clinic') && !signals.booking) {
    findings.push({
      id: 'no_online_booking',
      title: 'Customers cannot book an appointment on the site',
      evidence: 'No booking button or booking tool was found on the homepage.',
      howToCheck: 'Open the site and try to book a time without calling.',
      severity: 'high',
      offer: 'booking',
    });
  }
  if (!signals.whatsapp) {
    findings.push({
      id: 'no_whatsapp_link',
      title: 'No one-tap WhatsApp chat on the site',
      evidence: 'No wa.me / WhatsApp link was found on the homepage.',
      howToCheck: 'Open the site on your phone and look for a WhatsApp button.',
      severity: 'low',
      offer: 'whatsapp_automation',
    });
  }
  const year = signals.copyrightYear as number | undefined;
  if (year && year < new Date().getFullYear() - 1) {
    findings.push({
      id: 'stale_site',
      title: `The site still says © ${year}`,
      evidence: `The footer copyright year is ${year}.`,
      howToCheck: 'Scroll to the bottom of the homepage.',
      severity: 'low',
      offer: 'website',
    });
  }
  if (html.length > 3_000_000) {
    findings.push({
      id: 'heavy_page',
      title: 'The homepage is very heavy for mobile data',
      evidence: `The homepage HTML alone is about ${(html.length / 1_000_000).toFixed(1)} MB.`,
      howToCheck: 'Open the site on mobile data and time how long it takes to show.',
      severity: 'medium',
      offer: 'website',
    });
  }
  const score = await pageSpeed(page.url);
  if (score !== null) {
    signals.pageSpeedMobile = score;
    if (score < 50) {
      findings.push({
        id: 'slow_mobile',
        title: `Google rates the site ${score}/100 for speed on phones`,
        evidence: `PageSpeed Insights mobile performance score: ${score}.`,
        howToCheck: `Paste the address into pagespeed.web.dev and choose Mobile.`,
        severity: score < 30 ? 'high' : 'medium',
        offer: 'website',
      });
    }
  }
  const order = { high: 0, medium: 1, low: 2 } as const;
  findings.sort((a, b) => order[a.severity] - order[b.severity]);
  return { ranAt: new Date(), url: page.url, reachable: true, findings, signals };
}
