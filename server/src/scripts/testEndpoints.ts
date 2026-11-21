import './endpointTestEnv'; // must stay first
import http from 'node:http';
import dns from 'node:dns/promises';
import { PassThrough } from 'node:stream';
import { Types } from 'mongoose';
import { createTestSession } from './authTestHelper';
import { createApp } from '../app';
import { connectDb, disconnectDb } from '../lib/db';
import { env } from '../config/env';
import { User } from '../models/user.model';
import { Profile } from '../models/profile.model';
import { JobPost } from '../models/jobPost.model';
import { Application } from '../models/application.model';
import { Task } from '../models/task.model';
import { Notification } from '../models/notification.model';
import { BusinessLead } from '../models/businessLead.model';
import { RefreshToken } from '../models/refreshToken.model';
import { queues } from '../queues';
import { AuditLog } from '../models/audit.model';
import { BusinessServices } from '../models/businessServices.model';
import { SiteAccount } from '../models/siteAccount.model';
import { TaxonomyRequest } from '../models/taxonomyRequest.model';

interface TestResult {
  endpoint: string;
  method: string;
  expected: number;
  actual: number;
  durationMs: number;
  passed: boolean;
  notes?: string;
}

const results: TestResult[] = [];

function callExpress(
  app: any,
  method: string,
  url: string,
  headers: Record<string, string> = {},
  body: any = null,
): Promise<{ status: number; headers: Record<string, any>; body: string }> {
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
    if (body) {
      const b = typeof body === 'string' ? body : JSON.stringify(body);
      req.headers['content-type'] = req.headers['content-type'] || 'application/json';
      req.headers['content-length'] = String(Buffer.byteLength(b));
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
      });
      return this;
    };

    app(req, res);

    if (body) {
      const b = typeof body === 'string' ? body : JSON.stringify(body);
      req.push(b);
    }
    req.push(null);
  });
}

/**
 * High-fidelity in-memory Mongoose fallback for endpoint testing
 * when Atlas is unreachable or IP is not whitelisted.
 */
function setupInMemoryFallback() {
  console.log('[Suite] Initializing in-memory Mongoose store for fast endpoint validation.');

  const memoryUsers: any[] = [];
  const memoryProfiles: any[] = [];
  const memoryJobs: any[] = [];
  const memoryApplications: any[] = [];
  const memoryTasks: any[] = [];
  const memoryNotifications: any[] = [];
  const memoryBusinessLeads: any[] = [];
  const memoryTokens: any[] = [];

  // Instant DNS resolution for SSRF checks
  try {
    dns.lookup = (async () => [{ address: '93.184.216.34', family: 4 }]) as any;
  } catch {
    // Ignore if readonly
  }

  // Stub queues to avoid waiting on Redis connections in tests
  for (const q of Object.values(queues)) {
    (q as any).add = () => Promise.resolve({ id: 'mock-job-id' });
  }

  // Intercept outbound external crawls while letting local test server requests pass through
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: any, init?: any) => {
    const urlStr = typeof input === 'string' ? input : input?.url || input?.toString?.() || '';
    if (urlStr.startsWith('http://localhost') || urlStr.startsWith('http://127.0.0.1')) {
      return originalFetch(input, init);
    }
    return new Response(
      '<!DOCTYPE html><html><head><title>Senior Full-Stack Engineer at Stripe</title><meta name="description" content="Engineering role" /></head><body><h1>Senior Engineer</h1></body></html>',
      { status: 200, headers: { 'Content-Type': 'text/html' } },
    );
  }) as any;

  const createQueryChain = (data: any[]) => {
    const chain: any = {
      _data: [...data],
      sort: () => chain,
      skip: (n: number) => {
        chain._data = chain._data.slice(n);
        return chain;
      },
      limit: (n: number) => {
        chain._data = chain._data.slice(0, n);
        return chain;
      },
      lean: () => Promise.resolve(chain._data),
      populate: () => chain,
      select: () => chain,
      then: (resolve: any) => resolve(chain._data),
      catch: () => chain,
    };
    return chain;
  };

  // Mock User
  (User as any).exists = (query: any) => {
    const found = memoryUsers.find((u) => u.email === query.email?.toLowerCase());
    return {
      select: () => Promise.resolve(found ? { _id: found._id } : null),
      then: (resolve: any) => resolve(found ? { _id: found._id } : null),
    };
  };
  (User as any).findOne = (query: any) => {
    const found = memoryUsers.find((u) => u.email === query.email?.toLowerCase());
    return {
      select: () => Promise.resolve(found || null),
      lean: () => Promise.resolve(found || null),
      then: (resolve: any) => resolve(found || null),
    };
  };
  (User as any).findById = (id: any) => {
    const found = memoryUsers.find((u) => String(u._id) === String(id));
    return {
      select: () => ({
        lean: () => Promise.resolve(found || null),
        then: (resolve: any) => resolve(found || null),
      }),
      lean: () => Promise.resolve(found || null),
      then: (resolve: any) => resolve(found || null),
    };
  };
  (User as any).create = (doc: any) => {
    const _id = new Types.ObjectId();
    const userDoc = {
      _id,
      id: String(_id),
      ...doc,
      email: doc.email.toLowerCase(),
      toObject() {
        return { ...this };
      },
    };
    memoryUsers.push(userDoc);
    return Promise.resolve(userDoc);
  };

  // Mock RefreshToken
  (RefreshToken as any).create = (doc: any) => {
    const t = { _id: new Types.ObjectId(), ...doc };
    memoryTokens.push(t);
    return Promise.resolve(t);
  };
  (RefreshToken as any).findOne = (query: any) => {
    const found = memoryTokens.find((t) => t.tokenHash === query.tokenHash);
    return Promise.resolve(found || null);
  };
  (RefreshToken as any).updateMany = () => Promise.resolve({ modifiedCount: 1 });

  // Mock Profile
  (Profile as any).findOne = (query: any) => {
    let p = memoryProfiles.find((x) => String(x.userId) === String(query.userId));
    if (!p) {
      p = {
        _id: new Types.ObjectId(),
        userId: query.userId,
        status: 'draft',
        firstName: 'Alex',
        lastName: 'Okafor',
        fullName: 'Alex Okafor',
        email: 'alex@example.com',
        phone: '+234 801 234 5678',
        headline: 'Lead Software Engineer',
        location: 'Lekki, Lagos',
        careerPages: [],
        rules: { dailySendCap: 15, approvalMode: 'review' },
        experience: [],
        projects: [],
        education: [],
        targetRoles: ['Lead Software Engineer'],
        primarySkills: ['TypeScript', 'React', 'Node.js'],
        skills: [],
        set(keyOrObj: any, val?: any) {
          if (typeof keyOrObj === 'object') Object.assign(this, keyOrObj);
          else this[keyOrObj] = val;
        },
        toObject() {
          return { ...this };
        },
        save() {
          return Promise.resolve(this);
        },
      };
      memoryProfiles.push(p);
    }
    return {
      ...p,
      lean: () => Promise.resolve(p),
      then: (resolve: any) => resolve(p),
    };
  };
  (Profile as any).create = (doc: any) => {
    const p = {
      _id: new Types.ObjectId(),
      ...doc,
      careerPages: doc.careerPages || [],
      rules: doc.rules || { dailySendCap: 15, approvalMode: 'review' },
      experience: [],
      projects: [],
      education: [],
      targetRoles: [],
      primarySkills: [],
      skills: [],
      set(keyOrObj: any, val?: any) {
        if (typeof keyOrObj === 'object') Object.assign(this, keyOrObj);
        else this[keyOrObj] = val;
      },
      toObject() {
        return { ...this };
      },
      save() {
        return Promise.resolve(this);
      },
    };
    memoryProfiles.push(p);
    return Promise.resolve(p);
  };

  // Mock JobPost
  (JobPost as any).find = () => createQueryChain(memoryJobs);
  (JobPost as any).countDocuments = () => Promise.resolve(memoryJobs.length);
  (JobPost as any).findOne = () => Promise.resolve(memoryJobs[0] || null);
  (JobPost as any).create = (doc: any) => {
    const j = { _id: new Types.ObjectId(), id: String(new Types.ObjectId()), ...doc };
    memoryJobs.push(j);
    return Promise.resolve(j);
  };

  // Mock Application
  (Application as any).find = () => createQueryChain(memoryApplications);
  (Application as any).countDocuments = () => Promise.resolve(memoryApplications.length);

  // Mock Task
  (Task as any).find = () => createQueryChain(memoryTasks);

  // Mock Notification
  (Notification as any).find = (query?: any) => {
    let filtered = [...memoryNotifications];
    if (query?.readAt === null) filtered = filtered.filter((n) => !n.readAt);
    return createQueryChain(filtered);
  };
  (Notification as any).countDocuments = (query?: any) => {
    let filtered = [...memoryNotifications];
    if (query?.readAt === null) filtered = filtered.filter((n) => !n.readAt);
    return Promise.resolve(filtered.length);
  };
  (Notification as any).findOneAndUpdate = (query: any, update: any) => {
    const found = memoryNotifications.find((n) => String(n._id) === String(query._id));
    if (found && update.readAt) found.readAt = update.readAt;
    return Promise.resolve(found || null);
  };
  (Notification as any).updateMany = (query: any, update: any) => {
    for (const n of memoryNotifications) {
      if (query?.readAt === null ? !n.readAt : true) {
        if (update.readAt) n.readAt = update.readAt;
      }
    }
    return Promise.resolve({ modifiedCount: memoryNotifications.length });
  };
  (Notification as any).deleteOne = (query: any) => {
    const idx = memoryNotifications.findIndex((n) => String(n._id) === String(query._id));
    if (idx !== -1) memoryNotifications.splice(idx, 1);
    return Promise.resolve({ deletedCount: 1 });
  };
  (Notification as any).deleteMany = () => {
    memoryNotifications.length = 0;
    return Promise.resolve({ deletedCount: 1 });
  };
  (Notification as any).create = (doc: any) => {
    const n = { _id: new Types.ObjectId(), createdAt: new Date(), readAt: null, ...doc };
    memoryNotifications.unshift(n);
    return Promise.resolve(n);
  };

  // Mock AuditLog
  (AuditLog as any).find = () => createQueryChain([]);

  // Business Mode, site accounts and taxonomy requests: a small document store (create/find/save).
  const docStore = (Model: any, store: any[], defaults: Record<string, unknown> = {}) => {
    const match = (d: any, q: any = {}) => Object.entries(q).every(([k, v]) => String(d[k]) === String(v));
    const asDoc = (raw: any) => {
      const d: any = { _id: new Types.ObjectId(), createdAt: new Date(), updatedAt: new Date(), ...defaults, ...raw };
      Object.defineProperty(d, 'id', { get: () => String(d._id), enumerable: false });
      d.save = () => Promise.resolve(d);
      d.set = (k: any, v?: any) => (typeof k === 'object' ? Object.assign(d, k) : (d[k] = v));
      d.markModified = () => undefined;
      d.toObject = () => ({ ...d });
      return d;
    };
    const one = (v: any) => ({ lean: () => Promise.resolve(v), then: (r: any, j: any) => Promise.resolve(v).then(r, j), catch: (j: any) => Promise.resolve(v).catch(j) });
    Model.create = (doc: any) => {
      const d = asDoc(doc);
      store.push(d);
      return Promise.resolve(d);
    };
    Model.find = (q?: any) => createQueryChain(store.filter((d) => match(d, q)));
    Model.findOne = (q?: any) => one(store.find((d) => match(d, q)) ?? null);
    Model.findById = (id: any) => one(store.find((d) => String(d._id) === String(id)) ?? null);
    Model.updateOne = (q: any, update: any, opts: any = {}) => {
      let d = store.find((x) => match(x, q));
      if (!d && opts.upsert) store.push((d = asDoc(q)));
      if (d) Object.assign(d, update.$set ?? update);
      return Promise.resolve({ acknowledged: true });
    };
    Model.deleteOne = (q: any) => {
      const i = store.findIndex((d) => match(d, q));
      if (i >= 0) store.splice(i, 1);
      return Promise.resolve({ deletedCount: i >= 0 ? 1 : 0 });
    };
    Model.deleteMany = (q: any) => {
      for (let i = store.length - 1; i >= 0; i--) if (match(store[i], q)) store.splice(i, 1);
      return Promise.resolve({ acknowledged: true });
    };
  };
  docStore(BusinessLead, memoryBusinessLeads, { status: 'new', contacts: [], pitches: [], notes: [], history: [], valueInputs: {} });
  docStore(BusinessServices, [], { hourlyRate: 7500, fxRate: 1550, marginPct: 30, guarantees: { ownership: true, liveByDays: 21 }, caseStudies: [] });
  docStore(SiteAccount, []);
  docStore(TaxonomyRequest, []);
}

async function main() {
  console.log('\n============================================================');
  console.log('       J.A.V.I API Complete Endpoint Test Suite            ');
  console.log('============================================================\n');

  let baseUrl = process.env.TEST_API_URL || `http://localhost:${env.PORT || 4000}`;
  let ephemeralServer: http.Server | null = null;
  let didConnectDb = false;

  // Check if testing remote live server explicitly
  if (process.env.TEST_REMOTE === 'true' && process.env.TEST_API_URL) {
    try {
      const healthCheck = await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(1000) });
      if (healthCheck.ok) {
        console.log(`[Suite] Connecting to active server at ${baseUrl}\n`);
      } else {
        throw new Error('Not running');
      }
    } catch {
      console.log(`[Suite] Remote server unreachable. Falling back to ephemeral instance...`);
    }
  }

  let ephemeralApp: any = null;

  if (process.env.TEST_REMOTE !== 'true') {
    setupInMemoryFallback();
    ephemeralApp = createApp();
    console.log(`[Suite] Initialized in-process test engine with isolated mock DB\n`);
  }

  let authToken = '';
  let authCookie = '';
  let testLeadId = '';

  const headers = () => ({
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(authCookie ? { Cookie: authCookie } : {}),
  });

  async function test(
    name: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    expectedStatus: number | number[],
    body?: any,
    callback?: (data: any, res: any) => void,
  ) {
    const allowed = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
    const start = Date.now();
    let actualStatus = 0;
    let notes = '';

    try {
      let actualHeaders: any = {};
      let text = '';

      if (ephemeralApp) {
        const res = await callExpress(ephemeralApp, method, path, headers(), body);
        actualStatus = res.status;
        actualHeaders = res.headers;
        text = res.body;
      } else {
        const url = `${baseUrl}${path}`;
        const res = await fetch(url, {
          method,
          headers: headers(),
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(6000),
        });
        actualStatus = res.status;
        actualHeaders = {
          get: (k: string) => res.headers.get(k),
          'set-cookie': res.headers.get('set-cookie'),
        };
        text = await res.text();
      }

      const durationMs = Date.now() - start;

      const setCookie = actualHeaders['set-cookie'] || (typeof actualHeaders.get === 'function' && actualHeaders.get('set-cookie'));
      if (setCookie && String(setCookie).includes('javi_rt')) {
        authCookie = String(setCookie).split(';')[0];
      }

      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      const passed = allowed.includes(actualStatus);
      if (!passed) {
        notes = typeof data === 'object' ? data?.error || data?.message || text.slice(0, 80) : text.slice(0, 80);
      } else if (callback) {
        callback(data, { status: actualStatus, headers: actualHeaders, text: () => Promise.resolve(text) });
      }

      results.push({
        endpoint: `${method} ${path}`,
        method,
        expected: allowed[0],
        actual: actualStatus,
        durationMs,
        passed,
        notes,
      });

      const icon = passed ? '✓' : '✗';
      const color = passed ? '\x1b[32m' : '\x1b[31m';
      console.log(
        `${color}${icon}\x1b[0m [${method}] ${path.padEnd(38)} -> ${actualStatus} (expected ${allowed.join('/')}) in ${durationMs}ms ${notes ? `| ${notes}` : ''}`,
      );
    } catch (err: any) {
      const durationMs = Date.now() - start;
      results.push({
        endpoint: `${method} ${path}`,
        method,
        expected: allowed[0],
        actual: 0,
        durationMs,
        passed: false,
        notes: err.message,
      });
      console.log(`\x1b[31m✗\x1b[0m [${method}] ${path.padEnd(38)} -> ERR: ${err.message}`);
    }
  }

  // ---------------------------------------------------------------------------
  // 1. Health Checks
  // ---------------------------------------------------------------------------
  console.log('--- 1. Health Checks ---');
  await test('Root Health', 'GET', '/health', 200);
  await test('API Health', 'GET', '/api/health', 200);

  // ---------------------------------------------------------------------------
  // 2. Authentication Flow
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Authentication Flow ---');
  const uniqueId = Date.now().toString(36);
  // Sign-in is passwordless and needs an inbox; the full flow is covered by testPasswordlessAuth.ts.
  // Here we only need an authenticated user, so mint a session directly.
  authToken = (await createTestSession(`tester_${uniqueId}@example.com`, 'Test Runner')).accessToken;
  await test('Retired /auth/register is gone', 'POST', '/api/auth/register', 404, { email: 'x@example.com' });
  await test('Retired /auth/login is gone', 'POST', '/api/auth/login', 404, { email: 'x@example.com' });
  await test('Retired /auth/google is gone', 'POST', '/api/auth/google', 404, { email: 'x@example.com' });

  await test('Get Current User (Me)', 'GET', '/api/auth/me', 200);

  // ---------------------------------------------------------------------------
  // 2b. Taxonomy & Role-Skill Endpoints
  // ---------------------------------------------------------------------------
  console.log('\n--- 2b. Taxonomy & Role-Skill Endpoints ---');
  await test('Get Roles Taxonomy', 'GET', '/api/taxonomy/roles', 200);
  await test('Get Industries Taxonomy', 'GET', '/api/taxonomy/industries', 200);
  await test('Get Locations Taxonomy', 'GET', '/api/taxonomy/locations', 200);
  await test('Get Headline-Derived Skills', 'GET', '/api/taxonomy/skills?headline=Senior%20Product%20Designer%20Fintech', 200);
  await test('Submit Missing Taxonomy Option', 'POST', '/api/taxonomy/request', 201, {
    role_name: 'Rust Blockchain Core Dev',
    industry_name: 'DeFi & Cryptography',
    context: 'Looking for specialized Web3 systems jobs',
  });

  // ---------------------------------------------------------------------------
  // 3. Profile Operations
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Candidate Profile Operations ---');
  await test('Get Profile', 'GET', '/api/profile', 200);

  await test('Update Profile Details', 'PUT', '/api/profile', 200, {
    firstName: 'Alex',
    lastName: 'Tester',
    headline: 'Senior Full-Stack Engineer',
    phone: '+1 555 019 2831',
    location: 'Lekki, Lagos',
    workAuthorization: 'authorized',
    noticePeriod: '2 weeks',
    targetRoles: ['Senior Full-Stack Engineer', 'Engineering Lead'],
    primarySkills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
    summary: 'Senior engineer specializing in resilient API platforms and micro-frontends.',
  });

  await test('Add Watched Career Page', 'POST', '/api/profile/career-pages', [200, 201], {
    url: 'https://stripe.com/jobs',
  });

  await test('Remove Watched Career Page', 'DELETE', '/api/profile/career-pages?url=https://stripe.com/jobs', [200, 204]);

  // ---------------------------------------------------------------------------
  // 4. Jobs Ingestion & Feed
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Jobs Ingestion & Feed ---');
  await test('List Jobs', 'GET', '/api/jobs', 200);

  await test('Import Job URL', 'POST', '/api/jobs/import', [200, 201], {
    url: 'https://stripe.com/jobs/senior-dev',
  });

  // ---------------------------------------------------------------------------
  // 5. Applications & Funnel Tracker
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Applications & Funnel Tracker ---');
  await test('List Applications', 'GET', '/api/applications', 200);

  // ---------------------------------------------------------------------------
  // 6. Needs You Tasks Queue
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. Tasks Queue (Needs You) ---');
  await test('List Open Tasks', 'GET', '/api/tasks', 200);

  // ---------------------------------------------------------------------------
  // 7. Notifications
  // ---------------------------------------------------------------------------
  console.log('\n--- 7. Notifications ---');
  let testNotifId = '';
  await test('Create Notification', 'POST', '/api/notifications', [200, 201], {
    type: 'draft_ready',
    title: 'Stripe application draft generated',
    body: 'Custom resume tailored for Senior Automation Engineer.',
  });
  await test('List Notifications', 'GET', '/api/notifications', 200, undefined, (data) => {
    if (data?.notifications && data.notifications.length > 0) {
      testNotifId = String(data.notifications[0]._id);
    }
  });
  await test('Get Unread Notifications Count', 'GET', '/api/notifications/unread-count', 200);
  if (testNotifId) {
    await test('Mark Single Notification Read', 'POST', `/api/notifications/${testNotifId}/read`, 200);
    await test('Delete Single Notification', 'DELETE', `/api/notifications/${testNotifId}`, 200);
  }
  await test('Mark All Notifications Read', 'POST', '/api/notifications/read-all', [200, 204]);

  // ---------------------------------------------------------------------------
  // 8. Business Mode Discovery & Outreach
  // ---------------------------------------------------------------------------
  console.log('\n--- 8. Business Mode Discovery & Outreach ---');
  // Lead search hits OpenStreetMap, so this suite adds a lead by hand (no network).
  await test('Business Catalog', 'GET', '/api/business/catalog', 200);
  await test('Business Services Profile', 'GET', '/api/business/services', 200);
  await test('Add Business Lead', 'POST', '/api/business/leads', 201, {
    name: 'Test Bistro',
    vertical: 'restaurant',
    area: 'Lekki, Lagos',
    contacts: [{ kind: 'phone', value: '08030000000', isBusinessLine: true }],
  }, (data) => {
    testLeadId = data?._id || data?.id;
  });
  await test('List Business Leads', 'GET', '/api/business/leads', 200);

  if (testLeadId) {
    await test('Get Business Lead', 'GET', `/api/business/leads/${testLeadId}`, 200);
    await test('Quote Business Lead', 'POST', `/api/business/leads/${testLeadId}/quote`, 200);
    await test('Draft First Message', 'POST', `/api/business/leads/${testLeadId}/pitch`, 201, { variant: 'observation', channel: 'whatsapp' });
    await test('Call Scripts', 'GET', `/api/business/leads/${testLeadId}/scripts`, 200);
    await test('Lose Lead Without Reason (rejected)', 'POST', `/api/business/leads/${testLeadId}/status`, 400, { to: 'lost' });
  }

  // ---------------------------------------------------------------------------
  // 9. Analytics & Conversion Funnel
  // ---------------------------------------------------------------------------
  console.log('\n--- 9. Analytics & Conversion Funnel ---');
  await test('Get Funnel Conversion Rates', 'GET', '/api/analytics/funnel', 200);

  // ---------------------------------------------------------------------------
  // 10. Account & GDPR Data Portability
  // ---------------------------------------------------------------------------
  console.log('\n--- 10. Account & Data Portability ---');
  await test('Export User Data', 'GET', '/api/me/export', 200);

  // ---------------------------------------------------------------------------
  // 11. Form Auto-Fill & WhatsApp Alert Integration Tests
  // ---------------------------------------------------------------------------
  console.log('\n--- 11. Form Auto-Fill & WhatsApp Alert Integration ---');
  await test('Test Candidate Form Auto-Fill (LinkedIn & ATS)', 'POST', '/api/test/form-fill', 200);
  await test('Test WhatsApp Alert Dispatch', 'POST', '/api/test/whatsapp', 200, {
    phone: '2349025958370',
    message: 'Automated test alert from endpoint suite',
    type: 'sent',
  });
  await test('Test End-to-End Apply & WhatsApp Pipeline', 'POST', '/api/test/e2e-apply', 200);
  await test('Test Stripe LLM Tailored Apply Pipeline', 'POST', '/api/test/stripe-tailored-apply', 200);

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------
  if (ephemeralServer) {
    const s: http.Server = ephemeralServer;
    await new Promise<void>((resolve) => s.close(() => resolve()));
  }
  if (didConnectDb) {
    await disconnectDb();
  }

  // Summary Table
  console.log('\n============================================================');
  console.log('                     TEST SUMMARY                           ');
  console.log('============================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  const totalDuration = results.reduce((acc, r) => acc + r.durationMs, 0);

  console.log(`Total Endpoints Tested: ${totalCount}`);
  console.log(`Passed: \x1b[32m${passedCount}\x1b[0m`);
  console.log(`Failed: ${totalCount - passedCount > 0 ? `\x1b[31m${totalCount - passedCount}\x1b[0m` : '0'}`);
  console.log(`Total Duration: ${totalDuration}ms`);
  console.log('============================================================\n');

  if (passedCount < totalCount) {
    console.error(`\x1b[31m[FAILURE] ${totalCount - passedCount} test(s) failed.\x1b[0m`);
    process.exit(1);
  } else {
    console.log(`\x1b[32m[SUCCESS] All ${totalCount} endpoint tests passed cleanly!\x1b[0m\n`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('[Suite Error]', err);
  process.exit(1);
});
