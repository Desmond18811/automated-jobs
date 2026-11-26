import jwt from 'jsonwebtoken';
process.env.NODE_ENV = 'test';
import type { AddressInfo } from 'node:net';
import { createApp } from '../app';
import { activateMemoryDb } from '../lib/memoryDb';
import { sha256 } from '../lib/crypto';
import { RefreshToken } from '../models/refreshToken.model';
import { emailService } from '../services/email.service';
import { listSessions, logout, openLink, revokeAllSessions, rotate, startSignIn, verifySignIn } from '../services/auth.service';

/**
 * Passwordless sign-in and session lifetime, in-memory DB, real HTTP for the wire-level checks.
 * Run: npx tsx src/scripts/testPasswordlessAuth.ts
 */

let failures = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  console.log(`${ok ? '✅' : '❌'} ${name}${!ok && detail !== undefined ? `\n   ${JSON.stringify(detail).slice(0, 400)}` : ''}`);
  if (!ok) failures++;
}
const rejects = async (fn: () => Promise<unknown>): Promise<string | null> => {
  try {
    await fn();
    return null;
  } catch (e: any) {
    return e?.message ?? 'error';
  }
};

// Capture what would have been emailed.
let sent: { to: string; code: string; link: string }[] = [];
(emailService as any).sendSignInEmail = async (to: string, code: string, link: string) => {
  sent.push({ to, code, link });
};
const tokenOf = (link: string) => new URL(link).searchParams.get('token')!;
const meta = { ip: '127.0.0.1', userAgent: 'test-agent' };
const DAY = 864e5;

let seq = 0;
const freshEmail = () => `pl_${Date.now()}_${seq++}@example.com`;
/** Run a full sign-in and return the tokens. Cooldown means each email can only be started once per test. */
async function signIn(email = freshEmail()) {
  await startSignIn(email, meta);
  const mail = sent[sent.length - 1];
  return { email, tokens: await verifySignIn(tokenOf(mail.link), mail.code, meta), mail };
}
const wrongCode = (code: string) => (code === '000000' ? '111111' : '000000');

async function main() {
  activateMemoryDb();

  // ── Happy path ─────────────────────────────────────────────────────────────
  const email = freshEmail();
  const start = await startSignIn(email, meta);
  check('start sends exactly one email to the address', sent.length === 1 && sent[0].to === email);
  check('start response does not contain the code or link', !JSON.stringify(start).includes(sent[0].code) && !JSON.stringify(start).includes('token='), start);
  const link = await openLink(tokenOf(sent[0].link));
  check('opening the link reveals the email but signs nobody in', link.email === email && !('accessToken' in link));
  const ok = await verifySignIn(tokenOf(sent[0].link), sent[0].code, meta);
  check('link + code signs in with access + refresh tokens', Boolean(ok.accessToken && ok.refreshToken) && ok.user.email === email && ok.user.isEmailVerified === true, ok.user);
  check('new account goes to profile_setup', ok.stage === 'profile_setup', ok.stage);
  check('the link+code pair is single use', (await rejects(() => verifySignIn(tokenOf(sent[0].link), sent[0].code, meta))) !== null);

  // ── Two factors both required ──────────────────────────────────────────────
  const a = await signIn();
  await startSignIn(a.email, meta); // within cooldown: silently dropped
  check('resend inside the cooldown sends nothing', sent[sent.length - 1] === a.mail);

  const b = freshEmail();
  await startSignIn(b, meta);
  const mb = sent[sent.length - 1];
  check('code with a bogus link token fails', (await rejects(() => verifySignIn('x'.repeat(43), mb.code, meta))) !== null);
  check('link with the wrong code fails', (await rejects(() => verifySignIn(tokenOf(mb.link), wrongCode(mb.code), meta))) !== null);
  const okAfterOneMiss = await rejects(() => verifySignIn(tokenOf(mb.link), mb.code, meta));
  check('one wrong guess does not burn the challenge', okAfterOneMiss === null, okAfterOneMiss);

  // ── Attempt lockout ────────────────────────────────────────────────────────
  const c = freshEmail();
  await startSignIn(c, meta);
  const mc = sent[sent.length - 1];
  for (let i = 0; i < 5; i++) await rejects(() => verifySignIn(tokenOf(mc.link), wrongCode(mc.code), meta));
  const afterLock = await rejects(() => verifySignIn(tokenOf(mc.link), mc.code, meta));
  check('5 wrong codes lock the challenge even for the right code', afterLock !== null, afterLock);

  // ── Per-email send limit ───────────────────────────────────────────────────
  // (cooldown is 30s so a burst only ever produces one email)
  const d = freshEmail();
  const before = sent.length;
  await Promise.all([startSignIn(d, meta), startSignIn(d, meta)]).catch(() => {});
  check('rapid repeat starts do not spam the inbox', sent.length - before <= 2, sent.length - before);

  // ── Sessions: rotation, sliding, caps ──────────────────────────────────────
  const s = await signIn();
  const r1 = await rotate(s.tokens.refreshToken, meta);
  check('refresh rotates to a new token', r1.refreshToken !== s.tokens.refreshToken && Boolean(r1.accessToken));
  check('stage survives rotation', r1.stage === s.tokens.stage, [r1.stage, s.tokens.stage]);
  const grace = await rejects(() => rotate(s.tokens.refreshToken, meta));
  check('old token still works inside the grace window (two tabs)', grace === null, grace);

  const rows = (await RefreshToken.find({})) as any[];
  const mine = rows.filter((r) => r.family === rows.find((x) => x.tokenHash === sha256(r1.refreshToken))?.family);
  const first = mine.find((r) => r.tokenHash === sha256(s.tokens.refreshToken));
  first.rotatedAt = new Date(Date.now() - 60_000);
  await first.save();
  const reuse = await rejects(() => rotate(s.tokens.refreshToken, meta));
  check('reusing a long-rotated token is refused', reuse !== null);
  const afterReuse = await rejects(() => rotate(r1.refreshToken, meta));
  check('...and closes the whole session', afterReuse !== null, afterReuse);

  // Idle: 30 days of silence ends the session; activity within 30 days keeps it going.
  const idle = await signIn();
  let doc: any = (await RefreshToken.find({ tokenHash: sha256(idle.tokens.refreshToken) }))[0];
  const expectedIdle = doc.expiresAt.getTime() - Date.now();
  check('refresh token idle window is ~30 days', Math.abs(expectedIdle - 30 * DAY) < 60_000, expectedIdle / DAY);
  doc.expiresAt = new Date(Date.now() - 1000);
  await doc.save();
  check('a session idle past 30 days is refused', (await rejects(() => rotate(idle.tokens.refreshToken, meta))) !== null);

  // Absolute cap: keeps sliding, but never past 90 days from sign-in.
  const abs = await signIn();
  doc = (await RefreshToken.find({ tokenHash: sha256(abs.tokens.refreshToken) }))[0];
  doc.absoluteExpiresAt = new Date(Date.now() + 5 * DAY);
  await doc.save();
  const capped = await rotate(abs.tokens.refreshToken, meta);
  check('refresh expiry is capped by the 90-day limit', capped.refreshExpiresAt.getTime() - Date.now() <= 5 * DAY + 1000, (capped.refreshExpiresAt.getTime() - Date.now()) / DAY);
  doc = (await RefreshToken.find({ tokenHash: sha256(capped.refreshToken) }))[0];
  doc.absoluteExpiresAt = new Date(Date.now() - 1000);
  await doc.save();
  check('a session past 90 days is refused even if active', (await rejects(() => rotate(capped.refreshToken, meta))) !== null);

  // Sliding: using the session pushes expiry forward.
  const slide = await signIn();
  doc = (await RefreshToken.find({ tokenHash: sha256(slide.tokens.refreshToken) }))[0];
  doc.expiresAt = new Date(Date.now() + 2 * DAY); // 2 days left of idle time
  await doc.save();
  const slid = await rotate(slide.tokens.refreshToken, meta);
  check('using a session renews the 30-day idle window', slid.refreshExpiresAt.getTime() - Date.now() > 29 * DAY, (slid.refreshExpiresAt.getTime() - Date.now()) / DAY);

  // ── Logout and device management ───────────────────────────────────────────
  const l = await signIn();
  await logout(l.tokens.refreshToken);
  check('logout ends the session', (await rejects(() => rotate(l.tokens.refreshToken, meta))) !== null);

  const m = await signIn();
  const sessions = await listSessions(m.tokens.user.id, m.tokens.refreshToken);
  check('sessions lists the current device', sessions.length === 1 && sessions[0].current === true, sessions);
  await revokeAllSessions(m.tokens.user.id);
  check('sign out everywhere ends every session', (await rejects(() => rotate(m.tokens.refreshToken, meta))) !== null);

  // ── HTTP wire checks ───────────────────────────────────────────────────────
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
    fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });

  const he = freshEmail();
  const res = await post('/auth/start', { email: he });
  const text = await res.text();
  const hmail = sent[sent.length - 1];
  check('HTTP /auth/start answers 200 without leaking the code', res.status === 200 && !text.includes(hmail.code), text);

  const verify = await post('/auth/verify', { token: tokenOf(hmail.link), code: hmail.code });
  const setCookie = verify.headers.get('set-cookie') ?? '';
  const body = (await verify.json()) as any;
  check('HTTP /auth/verify sets an httpOnly refresh cookie', verify.status === 200 && /javi_rt=/.test(setCookie) && /HttpOnly/i.test(setCookie), setCookie);
  check('cookie lifetime is ~30 days', Math.abs(Number(/Max-Age=(\d+)/i.exec(setCookie)?.[1]) - 30 * 86400) < 120, setCookie);
  check('verify body has an access token and no refresh token', Boolean(body.accessToken) && !('refreshToken' in body), Object.keys(body));

  const cookie = setCookie.split(';')[0];
  const refreshed = await post('/auth/refresh', {}, { Cookie: cookie });
  check('HTTP /auth/refresh with the cookie returns a new access token', refreshed.status === 200 && Boolean(((await refreshed.json()) as any).accessToken));
  const noCookie = await post('/auth/refresh', {});
  check('HTTP /auth/refresh without a cookie is 401', noCookie.status === 401);
  const me = await fetch(base + '/auth/me', { headers: { Authorization: `Bearer ${body.accessToken}` } });
  check('GET /auth/me works with the access token', me.status === 200 && ((await me.json()) as any).email === he);

  for (const path of ['/auth/register', '/auth/login', '/auth/google', '/auth/verify-otp', '/auth/forgot-password', '/auth/reset-password', '/auth/resend-otp', '/auth/auto-session']) {
    const r = await post(path, { email: he, password: 'password123', otp: '123456' });
    check(`retired ${path} no longer exists`, r.status === 404, r.status);
  }
  const auto = await fetch(base + '/auth/auto-session', { headers: { Accept: 'application/json' } });
  check('GET /auth/auto-session is gone (no credential-less sign-in)', auto.status === 404, auto.status);
  const noEmailRefresh = await post('/auth/refresh', { email: he });
  check('refresh with only an email is refused', noEmailRefresh.status === 401, noEmailRefresh.status);
  const master = await post('/auth/verify', { token: tokenOf(hmail.link), code: '123456' });
  check('no master code bypass', master.status === 400);

  const auth = { Authorization: `Bearer ${body.accessToken}` };
  const jobs = await fetch(base + '/jobs', { headers: auth });
  check('an account that has not finished setup is refused (403) on /jobs', jobs.status === 403, jobs.status);
  const apps = await fetch(base + '/applications', { headers: auth });
  check('...and on /applications', apps.status === 403, apps.status);
  const selfDone = await fetch(base + '/auth/onboarding-stage', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...auth }, body: JSON.stringify({ stage: 'completed' }) });
  check('a client cannot mark itself completed with an empty profile', selfDone.status === 400, selfDone.status);
  const noTok = await fetch(base + '/jobs');
  check('no token is 401', noTok.status === 401);
  const junk = await fetch(base + '/jobs', { headers: { Authorization: 'Bearer abc.def.ghi' } });
  check('garbage token is 401', junk.status === 401);
  const forged = jwt.sign({ sid: 'x' }, 'wrong-secret', { subject: 'u1', audience: 'javi-api', issuer: 'javi' });
  const forgedRes = await fetch(base + '/auth/me', { headers: { Authorization: `Bearer ${forged}` } });
  check('a token signed with another secret is 401', forgedRes.status === 401);
  const evil = await post('/auth/refresh', {}, { Cookie: cookie, Origin: 'https://evil.example' });
  check('cross-site refresh is blocked', evil.status === 403, evil.status);
  const out = await post('/auth/logout', {}, { Cookie: cookie });
  const afterOut = await fetch(base + '/auth/me', { headers: auth });
  check('logout kills the access token immediately', out.status === 204 && afterOut.status === 401, [out.status, afterOut.status]);

  server.close();
  console.log(failures ? `\n${failures} check(s) failed` : '\nAll passwordless auth checks passed');
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
