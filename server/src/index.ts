import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import {
  getDB,
  cleanProfile,
  cleanSettings,
  publicSettings,
  setProfile,
  setSettings,
  setCv,
  addJobs,
  clearFinishedJobs,
  requeueJob,
  deleteJob,
  addIntakeBatch,
  getIntakeBatch,
  deleteIntakeBatch,
  acceptIntakeLeads,
  updateJob,
  normalizeTitle,
  SHOTS_DIR,
  CV_DIR,
  TRACES_DIR
} from './store.js';
import { extractCvText } from './cv.js';
import { processInputs } from './intake/read.js';
import { buildLeads } from './intake/leads.js';
import { scanListing } from './intake/listing.js';
import { exportQueue } from './intake/export.js';
import { runner } from './worker/runner.js';
import { mailReady, sendApplication, sendTestMail } from './mail.js';
import { whatsappReady } from './notify/whatsapp.js';
import * as alerts from './notify/alerts.js';
import { aiStatus, draftEmail, extractContactsByRules, extractProfileFromCv } from './ai.js';
import { listAnswers, upsertAnswer, updateAnswer, deleteAnswer } from './answers.js';
import { startWebhookServer } from './webhook.js';
import type { CvInfo, Flag, IntakeBatch, Lead, Profile } from './types.js';

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.use('/api/screenshots', express.static(SHOTS_DIR));
// Replays of jobs that failed or needed you. Open with: npx playwright show-trace <file>
app.use('/api/traces', express.static(TRACES_DIR));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/state', (_req, res) => {
  const db = getDB();
  const ai = aiStatus();
  res.json({
    profile: db.profile,
    settings: publicSettings(db.settings),
    cv: db.cv ? { fileName: db.cv.fileName, uploadedAt: db.cv.uploadedAt, chars: db.cv.text.length } : null,
    jobs: db.jobs,
    intake: db.intake,
    answers: listAnswers(),
    runner: runner.status(),
    aiReady: Boolean(ai.text),
    aiStatus: ai,
    mailReady: mailReady(),
    whatsappReady: whatsappReady(),
    notifyLast: alerts.lastEntry()
  });
});

app.put('/api/profile', (req, res) => {
  const cleaned = cleanProfile(req.body);
  setProfile(cleaned);
  res.json(cleaned);
});

app.put('/api/settings', (req, res) => {
  const cleaned = cleanSettings(req.body);
  setSettings(cleaned);
  res.json(publicSettings(cleaned));
});

app.post('/api/jobs', (req, res) => {
  const text = typeof req.body?.text === 'string' ? req.body.text : '';
  const matches: string[] = text.match(/https?:\/\/[^\s<>"'`)\]]+/g) || [];
  const urls = matches.map((u) => u.replace(/[.,;:!?)]+$/, '')).filter(Boolean);
  if (urls.length === 0) {
    res.status(400).json({ error: 'No links found. Paste URLs starting with http:// or https://.' });
    return;
  }
  res.json(addJobs(urls.map((url) => ({ kind: 'form' as const, url, source: 'pasted text' }))));
});

app.post('/api/jobs/clear-finished', (_req, res) => {
  res.json({ removed: clearFinishedJobs() });
});

app.post('/api/jobs/:id/requeue', (req, res) => {
  if (runner.isBusyWith(req.params.id)) {
    res.status(409).json({ error: 'Cannot modify this job while the runner is working on it.' });
    return;
  }
  const job = requeueJob(req.params.id);
  if (!job) {
    res.status(404).json({ error: 'Job not found.' });
    return;
  }
  res.json(job);
});

app.delete('/api/jobs/:id', (req, res) => {
  if (runner.isBusyWith(req.params.id)) {
    res.status(409).json({ error: 'Cannot modify this job while the runner is working on it.' });
    return;
  }
  if (!deleteJob(req.params.id)) {
    res.status(404).json({ error: 'Job not found.' });
    return;
  }
  res.json({ ok: true });
});

// ---------- CV ----------

const uploadCv = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, CV_DIR),
    filename: (_req, file, cb) => cb(null, file.originalname.replace(/[^\w.\- ]/g, '_'))
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const name = file.originalname.toLowerCase();
    const isPdf = file.mimetype === 'application/pdf' || name.endsWith('.pdf');
    const isDocx =
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || name.endsWith('.docx');
    if (isPdf || isDocx) cb(null, true);
    else cb(new Error('Only .pdf and .docx files are accepted.'));
  }
});

app.post('/api/cv', (req, res) => {
  uploadCv.single('cv')(req, res, async (err: any) => {
    if (err) {
      res.status(400).json({ error: err.message || 'Failed to upload CV.' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: 'No CV file uploaded.' });
      return;
    }
    try {
      const text = await extractCvText(req.file.path);
      if (text.length < 200) {
        fs.rmSync(req.file.path, { force: true });
        res.status(400).json({
          error: 'No readable text in this CV (it may be a scan). Export it from Word or Google Docs as PDF and upload that.'
        });
        return;
      }
      for (const f of fs.readdirSync(CV_DIR)) {
        const full = path.join(CV_DIR, f);
        if (full !== req.file.path) fs.rmSync(full, { force: true });
      }
      const cvInfo: CvInfo = {
        fileName: req.file.filename,
        path: req.file.path,
        text,
        uploadedAt: new Date().toISOString()
      };
      setCv(cvInfo);
      res.json({ fileName: cvInfo.fileName, chars: text.length });
    } catch (e: any) {
      fs.rmSync(req.file.path, { force: true });
      res.status(400).json({ error: `Couldn't read that file: ${e?.message || String(e)}` });
    }
  });
});

// Only facts the CV states. The dashboard merges these into EMPTY fields only.
app.post('/api/cv/autofill-profile', async (_req, res) => {
  const db = getDB();
  if (!db.cv?.text) {
    res.status(400).json({ error: 'Upload your CV first.' });
    return;
  }
  try {
    res.json(await extractProfileFromCv(db.cv.text));
  } catch (err: any) {
    res.status(500).json({ error: `Failed to read your CV: ${err?.message || err}` });
  }
});

// ---------- intake ----------

const uploadIntake = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024, files: 20 } });

app.post('/api/intake', (req, res) => {
  uploadIntake.array('files', 20)(req, res, async (err: any) => {
    if (err) {
      res.status(400).json({ error: err.message || 'Failed to process files.' });
      return;
    }

    const files = ((req as any).files as Array<{ originalname: string; buffer: Buffer; size: number; mimetype: string }>) || [];
    const text = typeof req.body?.text === 'string' ? req.body.text : '';
    const scanListings = req.body?.scanListings === 'true' || req.body?.scanListings === true;

    const sources: string[] = [...files.map((f) => f.originalname), ...(text ? ['pasted text'] : [])];
    const allWarnings: string[] = [];
    const allLeads: Lead[] = [];
    const deadline = Date.now() + 180_000;

    try {
      const { materials, listingUrls, warnings: readWarnings } = await processInputs({
        files: files.map((f) => ({ originalname: f.originalname, buffer: f.buffer, size: f.size, mimetype: f.mimetype })),
        pastedText: text,
        scanListings
      });
      allWarnings.push(...readWarnings);
      sources.push(...listingUrls);

      const { leads, warnings } = await buildLeads({ materials, existingJobs: getDB().jobs });
      allLeads.push(...leads);
      allWarnings.push(...warnings);

      if (scanListings) {
        for (const url of listingUrls) {
          if (Date.now() > deadline) {
            allWarnings.push(`Listing scan timed out before ${url}`);
            break;
          }
          const { leads: listingLeads, warnings: listWarnings } = await scanListing(url);
          allLeads.push(...listingLeads);
          allWarnings.push(...listWarnings);
        }
      }

      const batch: IntakeBatch = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        sources: Array.from(new Set(sources)),
        leads: allLeads,
        warnings: allWarnings
      };
      addIntakeBatch(batch);
      if (allLeads.length > 0) {
        const matchingCount = allLeads.filter((l) => l.selected && !l.duplicateOf).length;
        alerts.jobsFound(matchingCount, allLeads.length);
      }
      res.json(batch);
    } catch (e: any) {
      res.status(500).json({ error: `Intake error: ${e?.message || e}` });
    }
  });
});

app.get('/api/intake/:id', (req, res) => {
  const batch = getIntakeBatch(req.params.id);
  if (!batch) {
    res.status(404).json({ error: 'Intake batch not found.' });
    return;
  }
  res.json(batch);
});

app.delete('/api/intake/:id', (req, res) => {
  if (!deleteIntakeBatch(req.params.id)) {
    res.status(404).json({ error: 'Intake batch not found.' });
    return;
  }
  res.json({ ok: true });
});

app.post('/api/intake/:id/accept', (req, res) => {
  const leadIds = Array.isArray(req.body?.leadIds) ? req.body.leadIds : [];
  const result = acceptIntakeLeads(req.params.id, leadIds);
  if (!result) {
    res.status(404).json({ error: 'Intake batch not found.' });
    return;
  }
  res.json(result);
});

app.get('/api/export', (req, res) => {
  const format = req.query.format === 'csv' ? 'csv' : 'xlsx';
  const { data, fileName, contentType } = exportQueue(getDB().jobs, format);
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.send(data);
});

// ---------- answer library ----------

app.get('/api/answers', (_req, res) => {
  res.json(listAnswers());
});

app.post('/api/answers', (req, res) => {
  const question = typeof req.body?.question === 'string' ? req.body.question : '';
  const answer = req.body?.answer;
  if (!question.trim() || answer === undefined || answer === '') {
    res.status(400).json({ error: 'Give both the question and your answer.' });
    return;
  }
  const entry = upsertAnswer({ question, answer, source: 'dashboard' });
  if (!entry) {
    res.status(400).json({ error: "That question can't be saved (passwords, codes and ID or bank numbers are never stored)." });
    return;
  }
  res.json(entry);
});

app.put('/api/answers/:id', (req, res) => {
  const entry = updateAnswer(req.params.id, { answer: req.body?.answer, question: req.body?.question });
  if (!entry) {
    res.status(404).json({ error: 'Saved answer not found, or that question cannot be stored.' });
    return;
  }
  res.json(entry);
});

app.delete('/api/answers/:id', (req, res) => {
  if (!deleteAnswer(req.params.id)) {
    res.status(404).json({ error: 'Saved answer not found.' });
    return;
  }
  res.json({ ok: true });
});

// ---------- email and WhatsApp tests ----------

app.post('/api/mail/test', async (_req, res) => {
  const db = getDB();
  if (!mailReady()) {
    res.status(400).json({ error: 'Email sending is not configured (missing SMTP settings in server/.env).' });
    return;
  }
  if (!db.cv) {
    res.status(400).json({ error: 'Upload your CV first.' });
    return;
  }
  const targetEmail = process.env.MAIL_REDIRECT_TO || db.profile.email;
  if (!targetEmail) {
    res.status(400).json({ error: 'Add an email to your profile first or set MAIL_REDIRECT_TO in server/.env.' });
    return;
  }
  try {
    const fullName = `${db.profile.firstName} ${db.profile.lastName}`.trim();
    await sendTestMail({
      toEmail: targetEmail,
      cvPath: path.join(CV_DIR, db.cv.fileName),
      cvFileName: db.cv.fileName,
      fullName: fullName || undefined
    });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ error: (err?.message || String(err)).split('\n')[0].slice(0, 300) });
  }
});

// Shows the provider's exact reply, so "nothing arrived" can be diagnosed.
app.post('/api/notify/test', async (_req, res) => {
  const result = await alerts.sendTest();
  if (!result.ok) {
    res.status(400).json({ error: `${result.provider}${result.status ? ` (${result.status})` : ''}: ${result.response || 'no reply'}` });
    return;
  }
  res.json({ ok: true, provider: result.provider, response: result.response });
});

app.get('/api/notify/log', (_req, res) => {
  res.json(alerts.getLog(50));
});

// ---------- jobs: drafts and decisions ----------

app.put('/api/jobs/:id/draft', (req, res) => {
  const job = getDB().jobs.find((j) => j.id === req.params.id);
  if (!job) {
    res.status(404).json({ error: 'Job not found.' });
    return;
  }
  if (job.kind !== 'email' || (job.status !== 'review' && job.status !== 'needs_you')) {
    res.status(400).json({ error: 'Job is not waiting for review or changes.' });
    return;
  }
  const subject =
    typeof req.body?.subject === 'string' ? req.body.subject.trim().slice(0, 200) : job.draft?.subject || '';
  const body = typeof req.body?.body === 'string' ? req.body.body.trim().slice(0, 5000) : job.draft?.body || '';
  res.json(updateJob(job.id, { draft: { to: job.draft?.to || job.applyEmail || '', subject, body } }));
});

const VALID_DECISIONS = ['submit', 'refill', 'done', 'skip', 'scan', 'email', 'send'];

app.post('/api/jobs/:id/decision', async (req, res) => {
  const decision = req.body?.decision;
  if (!VALID_DECISIONS.includes(decision)) {
    res.status(400).json({ error: 'Unknown decision.' });
    return;
  }

  const db = getDB();
  const job = db.jobs.find((j) => j.id === req.params.id);
  if (!job) {
    res.status(404).json({ error: 'Job not found.' });
    return;
  }
  if (!job.actions || !job.actions.includes(decision)) {
    res.status(400).json({ error: "That action isn't available for this job." });
    return;
  }

  if (job.kind === 'form') {
    const ok = await runner.decide(req.params.id, decision);
    if (!ok) {
      res.status(409).json({ error: 'This job is not waiting on you anymore.' });
      return;
    }
    res.json(getDB().jobs.find((j) => j.id === req.params.id) || job);
    return;
  }

  // Email jobs are handled right here (no browser involved).
  if (decision === 'refill') {
    const draft = await draftEmail({
      profile: db.profile,
      cvText: db.cv?.text || '',
      title: job.title,
      company: job.company,
      postingText: job.postingText,
      subjectHint: job.subjectHint
    });
    const to = job.applyEmail || '';
    const hasMissing = draft.missing && draft.missing.length > 0;
    const flagged: Flag[] = hasMissing
      ? draft.missing.map((m) => ({ label: m, reason: 'The advert asks for this; add it to the draft or your profile', required: true }))
      : [];
    res.json(
      updateJob(job.id, {
        draft: { to, subject: draft.subject, body: draft.body },
        status: hasMissing ? 'needs_you' : 'review',
        flagged,
        message: hasMissing
          ? `Email drafted to ${to || 'the employer'}, but the advert asks for things not in your profile.`
          : `Email drafted to ${to || 'the employer'}. Check it, then click Send email.`,
        actions: ['send', 'refill', 'done', 'skip']
      })
    );
    return;
  }

  if (decision === 'done') {
    const updated = updateJob(job.id, { status: 'applied', message: 'Sent by you', actions: [], sentAt: new Date().toISOString() });
    if (updated) alerts.applied(updated);
    res.json(updated);
    return;
  }

  if (decision === 'skip') {
    res.json(updateJob(job.id, { status: 'skipped', message: 'Skipped', actions: [] }));
    return;
  }

  if (decision === 'send') {
    if (job.status !== 'review' && job.status !== 'needs_you') {
      res.status(409).json({ error: "This email isn't waiting to be sent." });
      return;
    }
    if (!mailReady()) {
      res.status(400).json({ error: "Email sending isn't set up. Add the SMTP settings to server/.env, or use Open in mail app." });
      return;
    }
    if (!db.cv) {
      res.status(400).json({ error: 'Upload your CV first.' });
      return;
    }

    const targetEmail = (job.draft?.to || job.applyEmail || '').trim().toLowerCase();
    const normTitle = normalizeTitle(job.title || '');
    // Only EMAIL jobs count here. (Form applications also get sentAt and used to eat the email limit.)
    const emailJobs = db.jobs.filter((j) => j.kind === 'email');
    const alreadySent = emailJobs.find(
      (j) =>
        j.id !== job.id &&
        Boolean(j.sentAt) &&
        (j.draft?.to || j.applyEmail || '').trim().toLowerCase() === targetEmail &&
        normalizeTitle(j.title || '') === normTitle
    );
    if (alreadySent) {
      res.status(409).json({
        error: `Already emailed ${targetEmail} for this role on ${new Date(alreadySent.sentAt!).toLocaleDateString()}.`
      });
      return;
    }

    const hourAgo = Date.now() - 3_600_000;
    const recent = emailJobs
      .filter((j) => j.sentAt && new Date(j.sentAt).getTime() > hourAgo)
      .sort((a, b) => new Date(a.sentAt!).getTime() - new Date(b.sentAt!).getTime());
    const maxPerHour = db.settings.maxEmailsPerHour || 10;
    if (recent.length >= maxPerHour) {
      const next = new Date(new Date(recent[0].sentAt!).getTime() + 3_600_000).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
      res.status(429).json({ error: `Hourly email limit reached (${maxPerHour}). Try again after ${next}.` });
      return;
    }

    try {
      const to = job.draft?.to || job.applyEmail || '';
      const fullName = `${db.profile.firstName} ${db.profile.lastName}`.trim();
      await sendApplication({
        to,
        subject: job.draft?.subject || `Application for ${job.title || 'role'}`,
        body: job.draft?.body || '',
        cvPath: path.join(CV_DIR, db.cv.fileName),
        cvFileName: db.cv.fileName,
        replyTo: db.profile.email,
        fullName: fullName || undefined
      });
      const updated = updateJob(job.id, { status: 'applied', message: `Emailed ${to}`, actions: [], sentAt: new Date().toISOString() });
      if (updated) alerts.applied(updated);
      res.json(updated);
    } catch (err: any) {
      const firstLine = (err?.message || String(err)).split('\n')[0].slice(0, 300);
      res.json(updateJob(job.id, { status: 'needs_you', message: `Couldn't send: ${firstLine}` }));
    }
    return;
  }

  res.status(400).json({ error: 'Unsupported action.' });
});

// ---------- runner ----------

app.post('/api/runner/start', async (req, res) => {
  if (req.body?.profile) setProfile(cleanProfile(req.body.profile));
  let db = getDB();

  if (!db.cv) {
    res.status(400).json({ error: 'Upload your CV first.' });
    return;
  }

  // Missing name/email/phone? Fill ONLY those empty fields from the CV. Nothing else is touched.
  const p = db.profile;
  if (!(p.firstName || p.lastName) || !p.email || !p.phone) {
    let found: Partial<Profile> = extractContactsByRules(db.cv.text);
    try {
      found = { ...found, ...(await extractProfileFromCv(db.cv.text)) };
    } catch {
      /* rules only */
    }
    const patch: Partial<Profile> = {};
    for (const k of ['firstName', 'lastName', 'email', 'phone'] as const) {
      if (!p[k] && found[k]) patch[k] = found[k];
    }
    if (Object.keys(patch).length) {
      setProfile(cleanProfile({ ...p, ...patch }));
      db = getDB();
    }
  }

  if (!(db.profile.firstName || db.profile.lastName) || !db.profile.email || !db.profile.phone) {
    res.status(400).json({ error: 'Add your name, email and phone to your profile first.' });
    return;
  }
  if (!db.jobs.some((j) => j.status === 'queued' && (j.kind === 'form' || j.kind === 'email'))) {
    res.status(400).json({ error: 'Add some jobs first.' });
    return;
  }

  runner.start();
  res.json({ ok: true });
});

app.post('/api/runner/stop', (_req, res) => {
  runner.stop();
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
  startWebhookServer();
});
