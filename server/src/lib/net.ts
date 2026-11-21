import { env } from '../config/env';
import dns from 'node:dns/promises';
import net from 'node:net';
import { AppError } from './http';

export const USER_AGENT = 'JAVI/0.1 (job search assistant)';

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  const v = ip.toLowerCase();
  if (v.startsWith('::ffff:')) return isPrivateIp(v.slice(7));
  return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80');
}

/** Blocks SSRF: user-supplied links must be public http(s) addresses. */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new AppError(400, `Invalid URL: ${raw}`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new AppError(400, 'Only http(s) links are allowed');
  const addrs = await dns.lookup(url.hostname, { all: true }).catch(() => []);
  if (!addrs.length) throw new AppError(400, `Could not resolve ${url.hostname}`);
  const allowPrivate = env.ALLOW_PRIVATE_URLS && env.NODE_ENV !== 'production';
  if (!allowPrivate && addrs.some((a) => isPrivateIp(a.address))) throw new AppError(400, 'That link points to a private network address');
  return url;
}

/** GET with a timeout, re-checking every redirect hop against the SSRF guard. */
export async function fetchText(raw: string, headers: Record<string, string> = {}): Promise<string> {
  let current = raw;
  for (let hop = 0; hop < 5; hop++) {
    await assertPublicUrl(current);
    const res = await fetch(current, {
      redirect: 'manual',
      signal: AbortSignal.timeout(20_000),
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json, text/html;q=0.9, */*;q=0.8', ...headers },
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) throw new Error(`Redirect without location from ${current}`);
      current = new URL(location, current).toString();
      continue;
    }
    if (!res.ok) throw new Error(`GET ${current} -> ${res.status}`);
    return res.text();
  }
  throw new Error(`Too many redirects for ${raw}`);
}

export async function fetchJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  return JSON.parse(await fetchText(url, headers)) as T;
}
