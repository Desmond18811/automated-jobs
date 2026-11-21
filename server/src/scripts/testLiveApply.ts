/**
 * End-to-end test of the live apply session against a mock job site, with a simulated user
 * answering over the reply channel. Runs the browser headless on a throwaway profile, so it doesn't
 * touch your real JAVI window. No MongoDB/Redis needed: the models it touches are patched in memory.
 *
 *   npx tsx src/scripts/testLiveApply.ts
 *
 * Flow on the mock site: listing → "Apply now" → sign-up wall (account created with a generated
 * password) → email verification code (asked of the user) → page 1 with two unknown questions
 * (asked) → page 2 behind a CAPTCHA (solved by the "human") → submit → confirmation.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { chromium } from 'playwright';
import { tmp } from './liveTestEnv'; // must stay first: sets env before config/env.ts is loaded
import { Types } from 'mongoose';
import { Task } from '../models/task.model';
import { Profile } from '../models/profile.model';
import { SiteAccount } from '../models/siteAccount.model';
import { Notification } from '../models/notification.model';
import { Application } from '../models/application.model';
import { User } from '../models/user.model';
import { AuditLog } from '../models/audit.model';
import { liveApply } from '../adapters/live/session';
import { handleReply, handleWhatsAppText } from '../services/reply.service';
import { formatMessage } from '../services/whatsapp.service';
import { decrypt } from '../lib/crypto';
import { disconnectLiveBrowser } from '../lib/liveBrowser';

let failures = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  console.log(`${ok ? '✅' : '❌'} ${name}${!ok && detail !== undefined ? `\n   ${JSON.stringify(detail).slice(0, 500)}` : ''}`);
  if (!ok) failures++;
}

/** Minimal in-memory stand-in for the mongoose models this flow touches. */
function patchModel(Model: any, store: any[], defaults: Record<string, unknown> = {}) {
  const wrap = (raw: any) => {
    if (raw.__wrapped) return raw;
    const doc = raw;
    doc._id ??= new Types.ObjectId();
    Object.defineProperty(doc, 'id', { get: () => String(doc._id), configurable: true });
    Object.defineProperty(doc, '__wrapped', { value: true });
    doc.save = async () => doc;
    doc.toObject = () => ({ ...doc });
    doc.set = (k: any, v?: any) => (typeof k === 'object' ? Object.assign(doc, k) : (doc[k] = v));
    return doc;
  };
  const matches = (d: any, q: any = {}) =>
    Object.entries(q).every(([k, v]: [string, any]) => {
      if (v && typeof v === 'object' && '$regex' in v) return new RegExp(v.$regex).test(String(d[k] ?? ''));
      return String(d[k]) === String(v);
    });
  const thenable = (value: any) => ({ lean: async () => value, exec: async () => value, then: (r: any, j: any) => Promise.resolve(value).then(r, j), catch: (j: any) => Promise.resolve(value).catch(j) });
  const chain = (list: any[]) => {
    const c: any = {
      sort: (spec: any) => {
        const [k, dir] = Object.entries(spec)[0] as [string, number];
        list.sort((a, b) => (a[k] > b[k] ? dir : -dir));
        return c;
      },
      limit: (n: number) => ((list = list.slice(0, n)), c),
      lean: async () => list,
      then: (r: any, j: any) => Promise.resolve(list).then(r, j),
    };
    return c;
  };
  Model.create = async (doc: any) => {
    const d = wrap({ createdAt: new Date(), ...defaults, ...doc });
    store.push(d);
    return d;
  };
  Model.find = (q?: any) => chain(store.filter((d) => matches(d, q)));
  Model.findOne = (q?: any) => {
    const found = store.filter((d) => matches(d, q)).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))[0] ?? null;
    const c: any = thenable(found);
    c.sort = () => c;
    return c;
  };
  Model.findById = (id: any) => thenable(store.find((d) => String(d._id) === String(id)) ?? null);
  Model.updateOne = async (q: any, update: any, opts: any = {}) => {
    let d = store.find((x) => matches(x, q));
    if (!d && opts.upsert) d = await Model.create({ ...q });
    if (d) Object.assign(d, update.$set ?? update);
    return { acknowledged: true };
  };
  Model.countDocuments = async (q?: any) => store.filter((d) => matches(d, q)).length;
  return { wrap };
}

/** The mock job site. Records what was created and submitted. */
function mockSite() {
  const express = require('express');
  const multer = require('multer');
  const app = express();
  const seen: any = { signups: [], submissions: [] as any[] };
  const page = (title: string, body: string) => `<!doctype html><html><head><title>${title}</title></head><body style="font-family:sans-serif">${body}</body></html>`;
  const cookie = (req: any, name: string) => (req.headers.cookie ?? '').split(/;\s*/).find((c: string) => c.startsWith(`${name}=`))?.split('=')[1];
  app.use(express.urlencoded({ extended: false }));

  app.get('/jobs/123', (_req: any, res: any) =>
    res.send(page('Senior Product Designer – Acme', `<h1>Senior Product Designer</h1><p>Acme Payments is hiring.</p><a href="/apply/123">Apply now</a>`)),
  );
  app.get('/apply/123', (req: any, res: any) => {
    if (cookie(req, 'acct') !== 'ok') return res.redirect('/signup');
    res.send(
      page(
        'Apply',
        `<h1>Application</h1><form method="post" action="/apply/123" enctype="multipart/form-data">
        <label for="fn">First name</label><input id="fn" name="first_name" required>
        <label for="ln">Last name</label><input id="ln" name="last_name" required>
        <label for="em">Email</label><input id="em" type="email" name="email" required>
        <label for="cv">Resume/CV</label><input id="cv" type="file" name="resume" required>
        <fieldset><legend>Are you legally authorized to work in the United States?</legend>
          <label for="a1">Yes</label><input id="a1" type="radio" name="authorized" value="yes" required>
          <label for="a2">No</label><input id="a2" type="radio" name="authorized" value="no">
        </fieldset>
        <label for="src">How did you hear about us?</label>
        <select id="src" name="source" required><option value="">Select…</option><option>LinkedIn</option><option>Referral</option><option>Job board</option></select>
        <label for="proj">Describe a project you are proud of</label><textarea id="proj" name="project" required></textarea>
        <button type="submit">Next</button></form>`,
      ),
    );
  });
  app.post('/apply/123', multer().single('resume'), (req: any, res: any) => {
    seen.submissions.push({ ...req.body, resume: req.file?.originalname, resumeBytes: req.file?.size });
    res.redirect('/apply/123/step2');
  });
  app.get('/apply/123/step2', (_req: any, res: any) =>
    res.send(
      page(
        'Apply – step 2',
        `<div class="g-recaptcha" id="cap" style="width:300px;height:78px;border:1px solid #999">
           <button type="button" onclick="document.getElementById('cap').remove()">I'm not a robot</button></div>
         <form method="post" action="/apply/123/step2">
           <label for="sd">Earliest start date</label><input id="sd" name="start">
           <button type="submit">Submit application</button></form>`,
      ),
    ),
  );
  app.post('/apply/123/step2', (req: any, res: any) => {
    seen.submissions.push(req.body);
    res.send(page('Done', '<h1>Thank you for applying!</h1><p>We have received your application.</p>'));
  });
  app.get('/signup', (_req: any, res: any) =>
    res.send(
      page(
        'Create an account',
        `<h1>Create an account</h1><form method="post" action="/signup">
        <label for="sfn">First name</label><input id="sfn" name="first_name" required>
        <label for="sem">Email</label><input id="sem" type="email" name="email" required>
        <label for="pw">Password</label><input id="pw" type="password" name="password" required>
        <label for="pw2">Confirm password</label><input id="pw2" type="password" name="password2" required>
        <button type="submit">Create account</button></form>`,
      ),
    ),
  );
  app.post('/signup', (req: any, res: any) => {
    seen.signups.push(req.body);
    res.redirect('/verify');
  });
  app.get('/verify', (_req: any, res: any) =>
    res.send(page('Verify', `<h1>Check your inbox</h1><form method="post" action="/verify"><label for="c">Verification code</label><input id="c" name="code" autocomplete="one-time-code"><button type="submit">Verify</button></form>`)),
  );
  app.post('/verify', (req: any, res: any) => {
    if (req.body.code !== '482913') return res.redirect('/verify');
    res.setHeader('Set-Cookie', 'acct=ok; Path=/');
    res.redirect('/apply/123');
  });
  return { app, seen };
}

async function main() {
  const tasks: any[] = [];
  const accounts: any[] = [];
  const profiles: any[] = [];
  const apps: any[] = [];
  patchModel(Task, tasks, { status: 'open' });
  const { wrap: wrapProfile } = patchModel(Profile, profiles);
  patchModel(SiteAccount, accounts);
  patchModel(Notification, []);
  const { wrap: wrapApp } = patchModel(Application, apps);
  patchModel(User, []);
  patchModel(AuditLog, []);


  const { app: site, seen } = mockSite();
  const server = site.listen(0);
  const base = `http://localhost:${(server.address() as AddressInfo).port}`;

  const userId = new Types.ObjectId();
  const profile = wrapProfile({
    userId,
    status: 'verified',
    firstName: 'Ada',
    lastName: 'Obi',
    fullName: 'Ada Obi',
    email: 'ada@example.com',
    phone: '', // no phone: notify() must not send a real WhatsApp during the test
    workAuthorization: 'authorized',
    earliestStartDate: '1 March 2027',
    answerBank: [],
    skills: [],
    links: [],
    primarySkills: [],
    experience: [],
    projects: [],
    education: [],
  });
  profiles.push(profile);
  const cvPath = path.join(tmp, 'Ada-Obi-CV.pdf');
  fs.writeFileSync(cvPath, '%PDF-1.4 test cv');
  const application = wrapApp({ userId, status: 'approved', channel: 'form', documents: { cvPdfPath: cvPath } });
  apps.push(application);

  // The "user": answers whatever JAVI asks, the way the reply page / WhatsApp would.
  const asked: string[] = [];
  let stop = false;
  const user = (async () => {
    while (!stop) {
      for (const t of tasks.filter((x) => x.status === 'open' && !x.__handled)) {
        t.__handled = true;
        asked.push(t.reason);
        if (t.reason === 'captcha') {
          // A human clicks the checkbox in the JAVI window.
          const b = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.LIVE_BROWSER_PORT}`);
          const p = b.contexts()[0].pages().find((pg) => pg.url().includes('step2'));
          await p?.getByRole('button', { name: "I'm not a robot" }).click();
          await b.close();
        } else if (t.questions?.length) {
          const answers: Record<string, string> = {};
          for (const q of t.questions) {
            answers[q.key] = /code/i.test(q.label) ? '482913' : /hear/i.test(q.label) ? 'LinkedIn' : 'I rebuilt Kuda’s card onboarding, cutting drop-off by 18%.';
          }
          await handleReply(t, 'answer', answers);
        } else {
          await handleReply(t, 'continue');
        }
      }
      await new Promise((r) => setTimeout(r, 500));
    }
  })();

  const result = await liveApply({
    userId: String(userId),
    app: application,
    job: { title: 'Senior Product Designer', company: 'Acme', url: `${base}/jobs/123`, applyMethod: { formUrl: `${base}/jobs/123` }, description: '' } as any,
    profile,
    extraAnswers: {},
  });
  stop = true;
  await user;

  check('application submitted (confirmation page seen)', result.status === 'sent', result);
  check('asked the user for the email verification code', asked.includes('login_wall'), asked);
  check('asked the two unknown form questions in one go', asked.includes('unknown_question') && tasks.find((t) => t.reason === 'unknown_question')?.questions.length === 2, tasks.map((t) => [t.reason, t.questions?.map((q: any) => q.label)]));
  check('paused for the CAPTCHA and continued once a human cleared it', asked.includes('captcha'), asked);
  check('dry-run: stopped before the final submit until the user said continue', asked.includes('confirm_submission'), asked);
  // Tasks are opened live; one released by the page itself (CAPTCHA cleared) is closed as done/not live.
  check('every task was opened live (page held open)', tasks.every((t) => t.live === true || (t.reason === 'captcha' && t.status === 'done')), tasks.map((t) => [t.reason, t.live, t.status]));

  const signup = seen.signups[0];
  check('created the account with the profile email', signup?.email === 'ada@example.com' && signup?.first_name === 'Ada', signup);
  check('used one generated password for both password fields', signup?.password && signup.password === signup.password2 && signup.password.length >= 12, signup);
  const acct = accounts[0];
  check('stored the site account with the password encrypted', acct?.method === 'password' && acct.passwordEnc && acct.passwordEnc !== signup?.password && decrypt(acct.passwordEnc) === signup?.password, acct);

  const page1 = seen.submissions[0];
  check('page 1: profile fields filled', page1?.first_name === 'Ada' && page1?.last_name === 'Obi' && page1?.email === 'ada@example.com', page1);
  check('page 1: CV uploaded', page1?.resume === 'Ada-Obi-CV.pdf' && page1?.resumeBytes > 0, page1);
  check('page 1: work authorization radio answered from profile', page1?.authorized === 'yes', page1);
  check('page 1: user answers used (select + textarea)', page1?.source === 'LinkedIn' && /card onboarding/.test(page1?.project ?? ''), page1);
  check('page 2: start date from profile', seen.submissions[1]?.start === '1 March 2027', seen.submissions[1]);
  check('answers saved to the answer bank for next time', profile.answerBank.some((a: any) => /hear about us/.test(a.question) && a.answer === 'LinkedIn'), profile.answerBank);

  // ── WhatsApp reply parsing ──────────────────────────────────────────────
  profile.phone = '+234 803 000 0000';
  const t1: any = await Task.create({ userId, reason: 'unknown_question', status: 'open', replyCode: '4821', live: true, questions: [{ key: 'notice', label: 'Notice period?', type: 'select', options: ['2 weeks', '1 month'], required: true }], payload: { company: 'Acme' } });
  const r1 = await handleWhatsAppText('whatsapp:+2348030000000', '4821 2');
  check('WhatsApp "4821 2" answers with option #2', t1.status === 'answered' && t1.answers?.notice === '1 month', { r1, t: t1.answers });
  const t2: any = await Task.create({ userId, reason: 'captcha', status: 'open', replyCode: '5555', live: true, questions: [] });
  await Task.create({ userId, reason: 'login_wall', status: 'open', replyCode: '6666', live: true, questions: [] });
  const r2 = await handleWhatsAppText('whatsapp:+2348030000000', 'done');
  check('ambiguous reply without a code asks for the code', /start your reply with the code/i.test(r2), r2);
  await handleWhatsAppText('whatsapp:+2348030000000', '5555 done');
  check('"5555 done" releases the live CAPTCHA wait', t2.status === 'done', t2.status);
  const r3 = await handleWhatsAppText('whatsapp:+447700900000', 'hello');
  check('unknown number is refused', /doesn't recognise/i.test(r3), r3);

  const msg = formatMessage(
    { title: 'A form asked something new', body: 'Acme asks 1 thing.', type: 'needs_user', data: { replyCode: '4821', replyUrl: 'http://x/r/abc', live: true, questions: [{ label: 'Notice period?', options: ['2 weeks', '1 month'] }] } },
    true,
  );
  check('WhatsApp text lists question, options, link and reply code', /Notice period\?/.test(msg) && /2 weeks \/ 1 month/.test(msg) && /http:\/\/x\/r\/abc/.test(msg) && /4821 your answer/.test(msg), msg);
  const sendOnly = formatMessage({ title: 't', body: 'b', type: 'needs_user', data: { replyCode: '4821', replyUrl: 'http://x/r/abc' } }, false);
  check('send-only providers get the link but no reply-by-text instructions', /http:\/\/x\/r\/abc/.test(sendOnly) && !/4821/.test(sendOnly), sendOnly);

  // Close the headless test browser (the real JAVI window is never started by this script).
  const b = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.LIVE_BROWSER_PORT}`);
  const cdp = await b.newBrowserCDPSession();
  await cdp.send('Browser.close').catch(() => undefined);
  await disconnectLiveBrowser();
  // Make sure the throwaway headless browser is gone (matched by its temp profile path only).
  try {
    require('node:child_process').execSync(`pkill -f ${JSON.stringify(tmp)}`);
  } catch {
    // already exited
  }
  server.close();
  await new Promise((r) => setTimeout(r, 1000)); // let the killed browser finish writing its profile
  try {
    fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 3 });
  } catch {
    // temp dir; the OS cleans it up
  }
  console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
