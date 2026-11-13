import { sha256 } from './crypto';

export function normalizeText(s = ''): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9+#]+/g, ' ')
    .trim();
}

const COMPANY_SUFFIXES = /\b(ltd|limited|inc|incorporated|llc|plc|gmbh|corp|corporation|co)\b/g;

export function normalizeCompany(s = ''): string {
  return normalizeText(s).replace(COMPANY_SUFFIXES, '').replace(/\s+/g, ' ').trim();
}

const TRACKING_PARAMS = [/^utm_/i, /^ref$/i, /^source$/i, /^gh_src$/i, /^lever-/i, /^fbclid$/i, /^gclid$/i, /^trk/i];

/** Strips tracking params, fragments, www and trailing slashes so the same posting hashes the same. */
export function canonicalUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.hash = '';
    for (const k of [...u.searchParams.keys()]) {
      if (TRACKING_PARAMS.some((r) => r.test(k))) u.searchParams.delete(k);
    }
    u.hostname = u.hostname.replace(/^www\./, '');
    return u.toString().replace(/\/$/, '').toLowerCase();
  } catch {
    return raw.trim().toLowerCase();
  }
}

/** Unique per posting: company + title + URL (the spec's dedupe hash). */
export function dedupeHashOf(company: string, title: string, url: string): string {
  return sha256([normalizeCompany(company), normalizeText(title), canonicalUrl(url)].join('|'));
}

/** Same role at the same company across different sources. Powers the duplicate-apply guard. */
export function fingerprintOf(company: string, title: string): string {
  return sha256([normalizeCompany(company), normalizeText(title)].join('|'));
}

export function safeHost(raw: string): string {
  try {
    return new URL(raw).hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

export function clip(s: string | undefined | null, max: number): string {
  return (s ?? '').trim().slice(0, max);
}

/** Key used for the answer bank, so "Years of experience?" and "years of experience" match. */
export function questionKey(label: string): string {
  return normalizeText(label).slice(0, 120);
}
