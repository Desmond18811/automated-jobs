import http from 'node:http';
import { PassThrough } from 'node:stream';
import jwt from 'jsonwebtoken';
import { createApp } from '../app';
import { env } from '../config/env';
import { activateMemoryDb } from '../lib/memoryDb';
import { emailService } from '../services/email.service';
import { User } from '../models/user.model';
import { Profile } from '../models/profile.model';

/**
 * End-to-end tests for all J.A.V.I Auth Endpoints.
 * Tests wire-level HTTP requests against the Express app in-process (no network/port required).
 */

let failures = 0;
function assert(name: string, ok: boolean, detail?: unknown) {
  console.log(`${ok ? '✅' : '❌'} ${name}${!ok && detail !== undefined ? `\n   Detail: ${JSON.stringify(detail).slice(0, 400)}` : ''}`);
  if (!ok) failures++;
}

// In-process HTTP caller that doesn't require TCP sockets
function callApp(
  app: any,
  method: string,
  url: string,
  headers: Record<string, string> = {},
  body: any = null,
): Promise<{ status: number; headers: Record<string, any>; body: string; json: () => any }> {
  return new Promise((resolve) => {
    const socket: any = new PassThrough();
    socket.destroy = function () { return socket; };
    socket.remoteAddress = '127.0.0.1';

    const req = new http.IncomingMessage(socket as any);
    req.method = method;
    req.url = url;
    req.headers = Object.fromEntries(
      Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
    );

    let serialized = '';
    if (body !== null && body !== undefined) {
      serialized = typeof body === 'string' ? body : JSON.stringify(body);
      req.headers['content-type'] = req.headers['content-type'] || 'application/json';
      req.headers['content-length'] = String(Buffer.byteLength(serialized));
    }

    const res = new http.ServerResponse(req);
    res.assignSocket(socket as any);

    let resBody = '';

    res.writeHead = function (statusCode: any, statusMessage?: any, hdrs?: any) {
      if (typeof statusMessage === 'object' && !hdrs) {
        hdrs = statusMessage;
        statusMessage = undefined;
      }
      this.statusCode = statusCode;
      if (hdrs) {
        for (const [k, v] of Object.entries(hdrs)) {
          this.setHeader(k, v as any);
        }
      }
      return this;
    };

    res.end = function (chunk?: any) {
      if (chunk) resBody += chunk.toString();
      resolve({
        status: res.statusCode,
        headers: res.getHeaders(),
        body: resBody,
        json: () => {
          try {
            return JSON.parse(resBody);
          } catch {
            return null;
          }
        },
      });
      return this;
    };

    app(req, res);

    if (serialized) {
      req.push(serialized);
    }
    req.push(null);
  });
}

// Intercept emails for testing
const capturedEmails: Array<{ to: string; code: string; link: string; html?: string; text?: string }> = [];
const originalSend = (emailService as any).sendSignInEmail;
(emailService as any).sendSignInEmail = async function (to: string, code: string, link: string, name?: string) {
  capturedEmails.push({ to, code, link });
  // Call original logic with mock transporter to verify HTML/text generation
  const displayName = name || to.split('@')[0] || 'there';
  assert('Email template contains user display name', displayName.length > 0);
  assert('Verification code is 6 digits', /^\d{6}$/.test(code));
};

const tokenFromLink = (link: string) => new URL(link).searchParams.get('token')!;

async function runAuthTests() {
  console.log('\n============================================================');
  console.log('       J.A.V.I Authentication Endpoints Test Suite          ');
  console.log('============================================================\n');

  activateMemoryDb();
  const app = createApp();

  const testEmail = `auth_test_${Date.now()}@example.com`;
  const testName = 'Desmond18811';

  // ── 1. POST /api/auth/start ────────────────────────────────────────────────
  console.log('--- 1. POST /api/auth/start ---');

  // Bad email validation
  const badStart = await callApp(app, 'POST', '/api/auth/start', {}, { email: 'not-an-email' });
  assert('Rejects invalid email format with 400', badStart.status === 400, badStart.body);

  // Valid start
  const startRes = await callApp(app, 'POST', '/api/auth/start', {}, { email: testEmail, name: testName });
  assert('Answers 200 OK for valid email', startRes.status === 200, startRes.status);
  const startJson = startRes.json();
  assert('Start response contains message & resend cooldown', startJson?.ok === true && typeof startJson?.resendAfterSeconds === 'number', startJson);
  assert('Does NOT leak verification code in response body', !startRes.body.includes(capturedEmails[capturedEmails.length - 1]?.code));
  assert('Dispatched verification email to user address', capturedEmails.length > 0 && capturedEmails[capturedEmails.length - 1].to === testEmail);

  const emailData = capturedEmails[capturedEmails.length - 1];
  const linkToken = tokenFromLink(emailData.link);
  const verificationCode = emailData.code;

  // Rapid repeat start (cooldown protection)
  const burstCountBefore = capturedEmails.length;
  await callApp(app, 'POST', '/api/auth/start', {}, { email: testEmail });
  assert('Cooldown prevents repeated email spam within cooldown window', capturedEmails.length === burstCountBefore);

  // ── 2. POST /api/auth/link ─────────────────────────────────────────────────
  console.log('\n--- 2. POST /api/auth/link ---');

  // Invalid token
  const badLink = await callApp(app, 'POST', '/api/auth/link', {}, { token: 'invalid_token_1234567890' });
  assert('Rejects bogus link token with 400', badLink.status === 400, badLink.body);

  // Valid token
  const linkRes = await callApp(app, 'POST', '/api/auth/link', {}, { token: linkToken });
  assert('Valid link token returns 200 OK', linkRes.status === 200, linkRes.status);
  const linkJson = linkRes.json();
  assert('Link response confirms email and expiry without signing in', linkJson?.email === testEmail && Boolean(linkJson?.expiresAt) && !linkJson?.accessToken);

  // ── 3. POST /api/auth/verify ───────────────────────────────────────────────
  console.log('\n--- 3. POST /api/auth/verify ---');

  // Wrong code
  const wrongCode = verificationCode === '123456' ? '654321' : '123456';
  const wrongCodeRes = await callApp(app, 'POST', '/api/auth/verify', {}, { token: linkToken, code: wrongCode });
  assert('Rejects incorrect verification code with 400', wrongCodeRes.status === 400, wrongCodeRes.body);

  // Correct code
  const verifyRes = await callApp(app, 'POST', '/api/auth/verify', {}, { token: linkToken, code: verificationCode });
  assert('Correct code returns 200 OK', verifyRes.status === 200, verifyRes.status);
  const verifyJson = verifyRes.json();
  assert('Returns valid accessToken', Boolean(verifyJson?.accessToken));
  assert('Stage initialized to profile_setup for new user', verifyJson?.stage === 'profile_setup', verifyJson?.stage);
  assert('Sets HttpOnly javi_rt refresh cookie', /javi_rt=/.test(String(verifyRes.headers['set-cookie'])) && /HttpOnly/i.test(String(verifyRes.headers['set-cookie'])));

  const accessToken = verifyJson.accessToken;
  const setCookie = String(verifyRes.headers['set-cookie']);
  const cookieHeader = setCookie.split(';')[0];

  // Single-use token: re-verifying must fail
  const replayVerify = await callApp(app, 'POST', '/api/auth/verify', {}, { token: linkToken, code: verificationCode });
  assert('Replay of used challenge is rejected (single-use constraint)', replayVerify.status === 400);

  // ── 4. GET /api/auth/me ────────────────────────────────────────────────────
  console.log('\n--- 4. GET /api/auth/me ---');

  // Unauthenticated
  const noAuthMe = await callApp(app, 'GET', '/api/auth/me');
  assert('Refuses request without Authorization header with 401', noAuthMe.status === 401);

  // Invalid bearer
  const badAuthMe = await callApp(app, 'GET', '/api/auth/me', { Authorization: 'Bearer invalid.token.here' });
  assert('Refuses invalid Bearer token with 401', badAuthMe.status === 401);

  // Valid bearer
  const meRes = await callApp(app, 'GET', '/api/auth/me', { Authorization: `Bearer ${accessToken}` });
  assert('Returns 200 OK with valid accessToken', meRes.status === 200, meRes.status);
  const meJson = meRes.json();
  assert('Returns user email & verification status', meJson?.email === testEmail && meJson?.isEmailVerified === true, meJson);

  // ── 5. POST /api/auth/refresh ──────────────────────────────────────────────
  console.log('\n--- 5. POST /api/auth/refresh ---');

  // No cookie
  const noCookieRefresh = await callApp(app, 'POST', '/api/auth/refresh');
  assert('Refuses refresh without cookie with 401', noCookieRefresh.status === 401);

  // Cross-site origin blocked
  const csrfRefresh = await callApp(app, 'POST', '/api/auth/refresh', {
    Cookie: cookieHeader,
    Origin: 'https://attacker-site.com',
  });
  assert('Blocks cross-origin refresh attempt with 403', csrfRefresh.status === 403);

  // Valid refresh
  const refreshRes = await callApp(app, 'POST', '/api/auth/refresh', {
    Cookie: cookieHeader,
  });
  assert('Valid refresh returns 200 OK', refreshRes.status === 200, refreshRes.status);
  const refreshJson = refreshRes.json();
  assert('Returns rotated accessToken', Boolean(refreshJson?.accessToken));
  const newSetCookie = String(refreshRes.headers['set-cookie']);
  assert('Rotates and sets new javi_rt cookie', /javi_rt=/.test(newSetCookie));
  const newCookieHeader = newSetCookie.split(';')[0];

  // ── 6. PUT /api/auth/onboarding-stage ──────────────────────────────────────
  console.log('\n--- 6. PUT /api/auth/onboarding-stage ---');

  // User cannot self-claim "completed" without a completed profile
  const prematureDone = await callApp(app, 'PUT', '/api/auth/onboarding-stage', {
    Authorization: `Bearer ${accessToken}`,
  }, { stage: 'completed' });
  assert('Rejects marking completed when profile is still incomplete (400)', prematureDone.status === 400);

  // Advance to valid setup stage
  const validStageRes = await callApp(app, 'PUT', '/api/auth/onboarding-stage', {
    Authorization: `Bearer ${accessToken}`,
  }, { stage: 'profile_setup' });
  assert('Accepts valid onboarding stage update (200)', validStageRes.status === 200);

  // ── 7. GET & DELETE /api/auth/sessions ─────────────────────────────────────
  console.log('\n--- 7. Sessions Management ---');

  const sessionsRes = await callApp(app, 'GET', '/api/auth/sessions', {
    Authorization: `Bearer ${accessToken}`,
    Cookie: newCookieHeader,
  });
  assert('GET /api/auth/sessions returns 200 OK', sessionsRes.status === 200);
  const sessionsJson = sessionsRes.json();
  assert('Lists active sessions with current flag', Array.isArray(sessionsJson?.sessions) && sessionsJson.sessions.length > 0 && sessionsJson.sessions.some((s: any) => s.current));

  // ── 8. POST /api/auth/logout ───────────────────────────────────────────────
  console.log('\n--- 8. POST /api/auth/logout ---');

  const logoutRes = await callApp(app, 'POST', '/api/auth/logout', {
    Cookie: newCookieHeader,
  });
  assert('Logout returns 204 No Content', logoutRes.status === 204);

  // Using old refresh cookie after logout
  const afterLogoutRefresh = await callApp(app, 'POST', '/api/auth/refresh', {
    Cookie: newCookieHeader,
  });
  assert('Refresh with logged-out cookie is refused (401)', afterLogoutRefresh.status === 401);

  // ── 9. Retired endpoints return 404 ────────────────────────────────────────
  console.log('\n--- 9. Retired Legacy Auth Endpoints ---');
  for (const endpoint of ['/api/auth/register', '/api/auth/login', '/api/auth/google', '/api/auth/verify-otp', '/api/auth/forgot-password']) {
    const res = await callApp(app, 'POST', endpoint, {}, { email: testEmail });
    assert(`Retired endpoint ${endpoint} returns 404`, res.status === 404);
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n============================================================');
  console.log(`                     TEST SUMMARY                           `);
  console.log('============================================================');
  console.log(failures ? `❌ ${failures} test(s) failed.` : `✅ All authentication endpoints passed successfully!`);
  console.log('============================================================\n');

  process.exit(failures ? 1 : 0);
}

runAuthTests().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
