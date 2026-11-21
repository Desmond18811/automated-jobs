import { env } from '../../config/env';
import { cacheGet, cacheSet } from '../../lib/cache';
import { AppError } from '../../lib/http';
import type { IBusinessLead, LeadContact } from '../../models/businessLead.model';
import { verticalSpec } from './catalog';

/**
 * Lead search on OpenStreetMap (free, no key). Nominatim turns the area into a point; Overpass
 * lists businesses with the vertical's tags around it. Data © OpenStreetMap contributors (ODbL):
 * the UI must show that credit.
 *
 * Usage policy: an identifying User-Agent, at most one request a second, and results cached for a
 * day so repeat searches don't hit the public servers.
 */

const UA = `JAVI-business-mode/0.1 (${env.OSM_CONTACT || 'contact: set OSM_CONTACT'})`;
const CACHE_SECONDS = 24 * 60 * 60;
const MAX_RESULTS = 50;

let lastRequest = 0;
async function politeFetch(url: string, init: RequestInit = {}, timeoutMs = 30_000): Promise<Response> {
  const wait = lastRequest + 1100 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequest = Date.now();
  return fetch(url, { ...init, headers: { 'User-Agent': UA, Accept: 'application/json', ...(init.headers ?? {}) }, signal: AbortSignal.timeout(timeoutMs) });
}

export interface FoundBusiness extends Pick<IBusinessLead, 'name' | 'vertical' | 'category' | 'address' | 'location' | 'website' | 'openingHours' | 'contacts' | 'area'> {
  osmId: string;
}

const PLACE_TYPES = new Set(['suburb', 'quarter', 'neighbourhood', 'city_district', 'residential', 'island', 'town', 'village', 'hamlet', 'city', 'borough']);

/**
 * Pick the place the user meant. Nominatim's first hit is often an administrative boundary whose
 * centre is far from the town ("Lekki, Lagos" → Ibeju-Lekki county), so prefer populated places
 * whose name contains every word typed, then the most local one.
 */
async function geocode(area: string): Promise<{ lat: number; lng: number; label: string }> {
  const cc = env.OSM_COUNTRY_CODES ? `&countrycodes=${encodeURIComponent(env.OSM_COUNTRY_CODES)}` : '';
  const res = await politeFetch(`${env.OSM_NOMINATIM_URL}/search?format=jsonv2&limit=8${cc}&q=${encodeURIComponent(area)}`);
  if (!res.ok) throw new AppError(502, `OpenStreetMap geocoding failed (${res.status})`);
  const hits = (await res.json()) as Array<{ lat: string; lon: string; display_name: string; addresstype?: string; place_rank?: number }>;
  if (!hits.length) throw new AppError(404, `Couldn't find “${area}” on the map. Try “Lekki Phase 1, Lagos” or a street name.`);
  const terms = area.toLowerCase().split(/[\s,]+/).filter((t) => t.length > 2);
  const score = (h: (typeof hits)[number]) => {
    const name = h.display_name.toLowerCase();
    return (PLACE_TYPES.has(h.addresstype ?? '') ? 100 : 0) + (terms.every((t) => name.includes(t)) ? 50 : 0) + (h.place_rank ?? 0);
  };
  const best = [...hits].sort((a, b) => score(b) - score(a))[0];
  return { lat: Number(best.lat), lng: Number(best.lon), label: best.display_name };
}

const clean = (v?: string) => v?.trim() || undefined;

function toBusiness(el: any, vertical: string, area: string): FoundBusiness | null {
  const t = el.tags ?? {};
  if (!t.name) return null;
  const contacts: LeadContact[] = [];
  const add = (kind: LeadContact['kind'], value?: string) => {
    for (const v of (value ?? '').split(/;\s*/).map((x) => x.trim()).filter(Boolean)) contacts.push({ kind, value: v, isBusinessLine: true });
  };
  add('phone', t.phone ?? t['contact:phone']);
  add('whatsapp', t['contact:whatsapp']);
  add('email', t.email ?? t['contact:email']);
  add('instagram', t['contact:instagram']);
  add('facebook', t['contact:facebook']);
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  const address = [t['addr:housenumber'], t['addr:street'], t['addr:suburb'] ?? t['addr:district'], t['addr:city']].filter(Boolean).join(', ');
  return {
    osmId: `${el.type}/${el.id}`,
    name: t.name,
    vertical: vertical as FoundBusiness['vertical'],
    category: clean(t.amenity ?? t.shop ?? t.office),
    address: address || undefined,
    area,
    location: lat !== undefined && lng !== undefined ? { lat, lng } : undefined,
    website: clean(t.website ?? t['contact:website'] ?? t.url),
    openingHours: clean(t.opening_hours),
    contacts,
  };
}

export async function searchBusinesses(vertical: string, area: string, radiusM = 4000): Promise<{ results: FoundBusiness[]; center: { lat: number; lng: number; label: string }; cached: boolean }> {
  const spec = verticalSpec(vertical);
  if (!spec) throw new AppError(400, `Unknown vertical "${vertical}"`);
  const radius = Math.min(Math.max(radiusM, 500), 8000);
  const key = `business:osm:${vertical}:${area.toLowerCase().trim()}:${radius}`;
  const hit = await cacheGet<{ results: FoundBusiness[]; center: { lat: number; lng: number; label: string } }>(key).catch(() => null);
  if (hit) return { ...hit, cached: true };

  const center = await geocode(area);
  const around = `(around:${radius},${center.lat},${center.lng})`;
  // One regex filter per tag key is much cheaper for Overpass than a union of exact-match queries.
  const byKey = new Map<string, string[]>();
  for (const [k, v] of spec.osmTags) byKey.set(k, [...(byKey.get(k) ?? []), v]);
  const filters = [...byKey.entries()]
    .map(([k, vals]) => (vals.includes('*') ? `nwr["${k}"]["name"]${around};` : `nwr["${k}"~"^(${vals.join('|')})$"]["name"]${around};`))
    .join('');
  const query = `[out:json][timeout:120];(${filters});out center tags ${MAX_RESULTS * 2};`;
  // Public Overpass servers get busy: try each configured server, and treat a "timed out" remark
  // (which comes back as 200 OK with no elements) as a failure, not as "no businesses here".
  let data: { elements?: any[]; remark?: string } | null = null;
  let lastError = '';
  for (const server of env.OSM_OVERPASS_URL.split(',').map((u) => u.trim()).filter(Boolean)) {
    try {
      const res = await politeFetch(
        server,
        { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `data=${encodeURIComponent(query)}` },
        150_000,
      );
      if (!res.ok) {
        lastError = `${new URL(server).host} answered ${res.status}`;
        continue;
      }
      const body = (await res.json()) as { elements?: any[]; remark?: string };
      if (!body.elements?.length && body.remark && /error|timed out|timeout/i.test(body.remark)) {
        lastError = `${new URL(server).host}: ${body.remark}`;
        continue;
      }
      data = body;
      break;
    } catch (err) {
      lastError = `${new URL(server).host}: ${(err as Error).message}`;
    }
  }
  if (!data) throw new AppError(502, `OpenStreetMap search is busy right now (${lastError}). Try again in a minute.`);
  const seen = new Set<string>();
  const results = (data.elements ?? [])
    .map((el) => toBusiness(el, vertical, area))
    .filter((b): b is FoundBusiness => Boolean(b) && !seen.has(b!.osmId) && Boolean(seen.add(b!.osmId)))
    // Businesses with a way to reach them first.
    .sort((a, b) => b.contacts.length - a.contacts.length)
    .slice(0, MAX_RESULTS);
  await cacheSet(key, { results, center }, CACHE_SECONDS).catch(() => undefined);
  return { results, center, cached: false };
}
