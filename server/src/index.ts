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
  CV_DIR
} from './store.js';
import { extractCvText } from './cv.js';
import { processInputs } from './intake/read.js';
import { buildLeads } from './intake/leads.js';
import { scanListing } from './intake/listing.js';
import { exportQueue } from './intake/export.js';
import { runner } from './worker/runner.js';
import { mailReady, sendApplication, sendTestMail } from './mail.js';
import { whatsappReady, sendAlert, validateWhatsAppConfig } from './notify/whatsapp.js';
import { extractProfileFromCv } from './ai.js';
import { draftEmail } from './ai.js';
import { startWebhookServer } from './webhook.js';
import type { CvInfo, Flag, IntakeBatch, Lead } from './types.js';

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Static screenshots
app.use('/api/screenshots', express.static(SHOTS_DIR));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// GET /api/state
app.get('/api/state', (_req, res) => {
  const db = getDB();
  const aiReady = Boolean(
    process.env.OPENROUTER_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.QWEN_API_KEY ||
    process.env.DEEPSEEK_API_KEY
  );

  res.json({
    profile: db.profile,
    settings: db.settings,
    cv: db.cv
      ? {
          fileName: db.cv.fileName,
          uploadedAt: db.cv.uploadedAt,
          chars: db.cv.text.length
        }
      : null,
    jobs: db.jobs,
    intake: db.intake,
    runner: runner.status(),
    aiReady,
    mailReady: mailReady(),
    whatsappReady: whatsappReady()
  });
});

// PUT /api/profile
app.put('/api/profile', (req, res) => {
  const cleaned = cleanProfile(req.body);
  setProfile(cleaned);
  res.json(cleaned);
});

// PUT /api/settings
app.put('/api/settings', (req, res) => {
  const cleaned = cleanSettings(req.body);
  setSettings(cleaned);
  res.json(cleaned);
});

// POST /api/jobs
app.post('/api/jobs', (req, res) => {
  const text = typeof req.body?.text === 'string' ? req.body.text : '';
  const urlRegex = /https?:\/\/[^\s<>"'`)\]]+/g;
  const matches: string[] = text.match(urlRegex) || [];
  const cleanedUrls: string[] = matches
    .map((u: string) => u.replace(/[.,;:!?)]+$/, ''))
    .filter(Boolean);

  if (cleanedUrls.length === 0) {
    res.status(400).json({
      error: 'No links found. Paste URLs starting with http:// or https://.'
    });
    return;
  }

  const inputs = cleanedUrls.map((url: string) => ({
    kind: 'form' as const,
    url,
    source: 'pasted text'
  }));

  const result = addJobs(inputs);
  res.json(result);
});

// POST /api/jobs/clear-finished
app.post('/api/jobs/clear-finished', (_req, res) => {
  const removed = clearFinishedJobs();
  res.json({ removed });
});

// POST /api/jobs/:id/requeue
app.post('/api/jobs/:id/requeue', (req, res) => {
  if (runner.isBusyWith(req.params.id)) {
    res
      .status(409)
      .json({ error: 'Cannot modify this job while the runner is working on it.' });
    return;
  }
  const job = requeueJob(req.params.id);
  if (!job) {
    res.status(404).json({ error: 'Job not found.' });
    return;
  }
  res.json(job);
});

// DELETE /api/jobs/:id
app.delete('/api/jobs/:id', (req, res) => {
  if (runner.isBusyWith(req.params.id)) {
    res
      .status(409)
      .json({ error: 'Cannot modify this job while the runner is working on it.' });
    return;
  }
  const deleted = deleteJob(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Job not found.' });
    return;
  }
  res.json({ ok: true });
});

// Multer storage for CV
const cvStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, CV_DIR);
  },
  filename: (_req, file, cb) => {
    const sanitized = file.originalname.replace(/[^\w.\- ]/g, '_');
    cb(null, sanitized);
  }
});

const uploadCv = multer({
  storage: cvStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (_req, file, cb) => {
    const isPdf =
      file.mimetype === 'application/pdf' ||
      file.originalname.toLowerCase().endsWith('.pdf');
    const isDocx =
      file.mimetype ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.originalname.toLowerCase().endsWith('.docx');

    if (isPdf || isDocx) {
      cb(null, true);
    } else {
      cb(new Error('Only .pdf and .docx files are accepted.'));
    }
  }
});

// POST /api/cv
app.post('/api/cv', (req, res) => {
  uploadCv.single('cv')(req, res, async (err) => {
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
        try {
          fs.unlinkSync(req.file.path);
        } catch {}
        res.status(400).json({
          error:
            'No readable text in this CV (it may be a scan). Export it from Word or Google Docs as PDF and upload that.'
        });
        return;
      }

      // Delete every other file in CV_DIR
      const files = fs.readdirSync(CV_DIR);
      for (const f of files) {
        const fullPath = path.join(CV_DIR, f);
        if (fullPath !== req.file.path) {
          try {
            fs.unlinkSync(fullPath);
          } catch {}
        }
      }

      const cvInfo: CvInfo = {
        fileName: req.file.filename,
        path: req.file.path,
        text,
        uploadedAt: new Date().toISOString()
      };
      setCv(cvInfo);

      res.json({
        fileName: cvInfo.fileName,
        chars: text.length
      });
    } catch (e: any) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {}
      res.status(400).json({
        error: `Couldn't read that file: ${e?.message || String(e)}`
      });
    }
  });
});

// POST /api/cv/autofill-profile
app.post('/api/cv/autofill-profile', async (_req, res) => {
  const db = getDB();
  if (!db.cv || !db.cv.text) {
    res.status(400).json({ error: 'Upload your CV first.' });
    return;
  }
  try {
    const extracted = await extractProfileFromCv(db.cv.text);
    res.json(extracted);
  } catch (err: any) {
    res.status(500).json({
      error: `Failed to extract profile from CV: ${err?.message || err}`
    });
  }
});

// Multer memory storage for intake files (up to 20 files, 25 MB each)
const uploadIntake = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 20 }
});

// POST /api/intake
app.post('/api/intake', (req, res) => {
  uploadIntake.array('files', 20)(req, res, async (err) => {
    if (err) {
      res.status(400).json({ error: err.message || 'Failed to process files.' });
      return;
    }

    const files = (req.files as Express.Multer.File[]) || [];
    const text = typeof req.body?.text === 'string' ? req.body.text : '';
    const scanListings =
      req.body?.scanListings === 'true' || req.body?.scanListings === true;

    const sources: string[] = [
      ...files.map((f) => f.originalname),
      ...(text ? ['pasted text'] : [])
    ];
    const allWarnings: string[] = [];
    const allLeads: Lead[] = [];

    // 180s total request timeout guard
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 180_000);

    try {
      // Process inputs into raw material
      const inputFiles = files.map((f) => ({
        originalname: f.originalname,
        buffer: f.buffer,
        size: f.size,
        mimetype: f.mimetype
      }));

      const { materials, listingUrls, warnings: readWarnings } =
        await processInputs({
          files: inputFiles,
          pastedText: text,
          scanListings
        });

      allWarnings.push(...readWarnings);
      sources.push(...listingUrls);

      // Build leads from raw materials
      const { leads: materialLeads, warnings: leadWarnings } = await buildLeads({
        materials,
        existingJobs: getDB().jobs
      });

      allLeads.push(...materialLeads);
      allWarnings.push(...leadWarnings);

      // Scan listing pages if requested
      if (scanListings && listingUrls.length > 0) {
        for (const url of listingUrls) {
          if (abortController.signal.aborted) {
            allWarnings.push(`Listing scan timed out for ${url}`);
            break;
          }
          const { leads: listingLeads, warnings: listWarnings } =
            await scanListing(url);
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
      res.json(batch);
    } catch (e: any) {
      if (abortController.signal.aborted) {
        allWarnings.push('Intake request reached 180 s limit.');
      }
      res.status(500).json({ error: `Intake error: ${e?.message || e}` });
    } finally {
      clearTimeout(timeout);
    }
  });
});

// GET /api/intake/:id
app.get('/api/intake/:id', (req, res) => {
  const batch = getIntakeBatch(req.params.id);
  if (!batch) {
    res.status(404).json({ error: 'Intake batch not found.' });
    return;
  }
  res.json(batch);
});

// DELETE /api/intake/:id
app.delete('/api/intake/:id', (req, res) => {
  const deleted = deleteIntakeBatch(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Intake batch not found.' });
    return;
  }
  res.json({ ok: true });
});

// POST /api/intake/:id/accept
app.post('/api/intake/:id/accept', (req, res) => {
  const leadIds = Array.isArray(req.body?.leadIds) ? req.body.leadIds : [];
  const result = acceptIntakeLeads(req.params.id, leadIds);
  if (!result) {
    res.status(404).json({ error: 'Intake batch not found.' });
    return;
  }
  res.json(result);
});

// GET /api/export
app.get('/api/export', (req, res) => {
  const format = req.query.format === 'csv' ? 'csv' : 'xlsx';
  const { data, fileName, contentType } = exportQueue(getDB().jobs, format);
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.send(data);
});

// POST /api/mail/test
app.post('/api/mail/test', async (_req, res) => {
  const db = getDB();
  if (!mailReady()) {
    res.status(400).json({
      error: 'Email sending is not configured (missing SMTP settings in server/.env).'
    });
    return;
  }
  if (!db.cv) {
    res.status(400).json({ error: 'Upload your CV first.' });
    return;
  }
  const targetEmail = process.env.MAIL_REDIRECT_TO || db.profile.email;
  if (!targetEmail) {
    res.status(400).json({
      error: 'Add an email to your profile first or set MAIL_REDIRECT_TO in server/.env.'
    });
    return;
  }

  try {
    const cvPath = path.join(CV_DIR, db.cv.fileName);
    const fullName = `${db.profile.firstName} ${db.profile.lastName}`.trim();
    await sendTestMail({
      toEmail: targetEmail,
      cvPath,
      cvFileName: db.cv.fileName,
      fullName: fullName || undefined
    });
    res.json({ ok: true });
  } catch (err: any) {
    const firstLine = (err?.message || String(err)).split('\n')[0].slice(0, 300);
    res.status(400).json({ error: firstLine });
  }
});

// POST /api/notify/test
app.post('/api/notify/test', async (_req, res) => {
  const validationError = validateWhatsAppConfig();
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const link = process.env.DASHBOARD_URL || 'http://localhost:5173';
  const ok = await sendAlert({
    title: 'Test alert',
    reason: 'WhatsApp alerts are working.',
    link
  });

  if (!ok) {
    res.status(400).json({
      error:
        'WhatsApp test alert could not be delivered. Check server console for provider error.'
    });
    return;
  }

  res.json({ ok: true });
});

// PUT /api/jobs/:id/draft
app.put('/api/jobs/:id/draft', (req, res) => {
  const db = getDB();
  const job = db.jobs.find((j) => j.id === req.params.id);
  if (!job) {
    res.status(404).json({ error: 'Job not found.' });
    return;
  }
  if (
    job.kind !== 'email' ||
    (job.status !== 'review' && job.status !== 'needs_you')
  ) {
    res.status(400).json({ error: 'Job is not waiting for review or changes.' });
    return;
  }

  const subject =
    typeof req.body?.subject === 'string'
      ? req.body.subject.trim().slice(0, 200)
      : job.draft?.subject || '';
  const body =
    typeof req.body?.body === 'string'
      ? req.body.body.trim().slice(0, 5000)
      : job.draft?.body || '';

  const updated = updateJob(job.id, {
    draft: {
      to: job.draft?.to || job.applyEmail || '',
      subject,
      body
    }
  });

  res.json(updated);
});

// POST /api/jobs/:id/decision
app.post('/api/jobs/:id/decision', async (req, res) => {
  const decision = req.body?.decision;
  const validDecisions = [
    'submit',
    'refill',
    'done',
    'skip',
    'scan',
    'email',
    'send'
  ];
  if (!validDecisions.includes(decision)) {
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
      res
        .status(409)
        .json({ error: 'This job is not waiting on you anymore.' });
      return;
    }
    const updated = getDB().jobs.find((j) => j.id === req.params.id) || job;
    res.json(updated);
    return;
  }

  if (job.kind === 'email') {
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
      const targetStatus = hasMissing ? 'needs_you' : 'review';
      const flagged: Flag[] = hasMissing
        ? draft.missing.map((m) => ({
            label: m,
            reason: 'The advert asks for this; add it to the draft or your profile',
            required: true
          }))
        : [];
      const message = hasMissing
        ? `Email drafted to ${to || 'the employer'}, but the advert asks for things not in your profile.`
        : `Email drafted to ${to || 'the employer'}. Check it, then click Send email.`;

      const updated = updateJob(job.id, {
        draft: {
          to,
          subject: draft.subject,
          body: draft.body
        },
        status: targetStatus,
        flagged,
        message,
        actions: ['send', 'refill', 'done', 'skip']
      });
      res.json(updated);
      return;
    }

    if (decision === 'done') {
      const updated = updateJob(job.id, {
        status: 'applied',
        message: 'Sent by you',
        actions: [],
        sentAt: new Date().toISOString()
      });
      res.json(updated);
      return;
    }

    if (decision === 'skip') {
      const updated = updateJob(job.id, {
        status: 'skipped',
        message: 'Skipped',
        actions: []
      });
      res.json(updated);
      return;
    }

    if (decision === 'send') {
      if (job.status !== 'review' && job.status !== 'needs_you') {
        res.status(409).json({ error: "This email isn't waiting to be sent." });
        return;
      }

      if (!mailReady()) {
        res.status(400).json({
          error:
            "Email sending isn't set up. Add the SMTP settings to server/.env, or use Open in mail app."
        });
        return;
      }

      if (!db.cv) {
        res.status(400).json({ error: 'Upload your CV first.' });
        return;
      }

      const targetEmail = (job.draft?.to || job.applyEmail || '').trim().toLowerCase();
      const normTitle = normalizeTitle(job.title || '');
      const alreadySent = db.jobs.find(
        (j) =>
          j.id !== job.id &&
          Boolean(j.sentAt) &&
          (j.draft?.to || j.applyEmail || '').trim().toLowerCase() === targetEmail &&
          normalizeTitle(j.title || '') === normTitle
      );
      if (alreadySent) {
        const sentDate = new Date(alreadySent.sentAt!).toLocaleDateString();
        res.status(409).json({
          error: `Already emailed ${targetEmail} for this role on ${sentDate}.`
        });
        return;
      }

      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const recentEmails = db.jobs
        .filter((j) => j.sentAt && new Date(j.sentAt).getTime() > oneHourAgo)
        .sort(
          (a, b) =>
            new Date(a.sentAt!).getTime() - new Date(b.sentAt!).getTime()
        );

      const maxPerHour = db.settings.maxEmailsPerHour || 10;
      if (recentEmails.length >= maxPerHour) {
        const oldestTime = new Date(recentEmails[0].sentAt!).getTime();
        const nextAvailableTime = new Date(oldestTime + 60 * 60 * 1000).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        });
        res.status(429).json({
          error: `Hourly email limit reached (${maxPerHour}). Try again after ${nextAvailableTime}.`
        });
        return;
      }

      try {
        const cvPath = path.join(CV_DIR, db.cv.fileName);
        const to = job.draft?.to || job.applyEmail || '';
        const subject = job.draft?.subject || `Application for ${job.title || 'role'}`;
        const body = job.draft?.body || '';
        const fullName = `${db.profile.firstName} ${db.profile.lastName}`.trim();

        await sendApplication({
          to,
          subject,
          body,
          cvPath,
          cvFileName: db.cv.fileName,
          replyTo: db.profile.email,
          fullName: fullName || undefined
        });

        const updated = updateJob(job.id, {
          status: 'applied',
          message: `Emailed ${to}`,
          actions: [],
          sentAt: new Date().toISOString()
        });
        res.json(updated);
        return;
      } catch (err: any) {
        const firstLine = (err?.message || String(err)).split('\n')[0].slice(0, 300);
        const updated = updateJob(job.id, {
          status: 'needs_you',
          message: `Couldn't send: ${firstLine}`
        });
        res.json(updated);
        return;
      }
    }
  }

  res.status(400).json({ error: 'Unsupported action.' });
});

// POST /api/runner/start
app.post('/api/runner/start', async (req, res) => {
  let db = getDB();

  // If client provided profile data in the request body, save it immediately
  if (req.body?.profile) {
    const cleaned = cleanProfile(req.body.profile);
    setProfile(cleaned);
    db = getDB();
  }

  if (!db.cv) {
    res.status(400).json({ error: 'Upload your CV first.' });
    return;
  }

  // If profile is missing name, email or phone, try auto-extracting from CV
  if (
    !(db.profile.firstName || db.profile.lastName) ||
    !db.profile.email ||
    !db.profile.phone
  ) {
    if (db.cv?.text) {
      try {
        const extracted = await extractProfileFromCv(db.cv.text);
        if (extracted.firstName || extracted.lastName || extracted.email || extracted.phone) {
          const merged = cleanProfile({ ...db.profile, ...extracted });
          setProfile(merged);
          db = getDB();
        }
      } catch {}
    }
  }

  if (
    !(db.profile.firstName || db.profile.lastName) ||
    !db.profile.email ||
    !db.profile.phone
  ) {
    res.status(400).json({
      error: 'Add your name, email and phone to your profile first.'
    });
    return;
  }
  const hasQueued = db.jobs.some(
    (j) => j.status === 'queued' && (j.kind === 'form' || j.kind === 'email')
  );
  if (!hasQueued) {
    res.status(400).json({ error: 'Add some jobs first.' });
    return;
  }

  runner.start();
  res.json({ ok: true });
});

// POST /api/runner/stop
app.post('/api/runner/stop', (_req, res) => {
  runner.stop();
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
  startWebhookServer();
});
