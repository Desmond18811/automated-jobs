import crypto from 'node:crypto';
import express from 'express';
import { runner } from './worker/runner.js';
import { getDB, updateJob } from './store.js';
import { sendWhatsAppReply, isWebhookEnabled } from './notify/whatsapp.js';
import type { Decision } from './types.js';

const processedMessageIds: string[] = [];

function recordProcessedMessageId(id: string): boolean {
  if (processedMessageIds.includes(id)) {
    return true; // Already processed
  }
  processedMessageIds.push(id);
  if (processedMessageIds.length > 200) {
    processedMessageIds.shift();
  }
  return false;
}

export function createWebhookApp(): express.Express {
  const app = express();

  // GET /webhooks/whatsapp: Meta webhook verification
  app.get('/webhooks/whatsapp', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;

    if (mode === 'subscribe' && expectedToken && token === expectedToken) {
      console.log('[webhook] Webhook challenge verified successfully.');
      res.status(200).send(String(challenge));
      return;
    }

    console.warn('[webhook] Failed verification attempt with token:', token);
    res.sendStatus(403);
  });

  // POST /webhooks/whatsapp: Incoming messages from Meta Cloud API
  app.post(
    '/webhooks/whatsapp',
    express.raw({ type: '*/*' }),
    (req, res) => {
      const rawBody = Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(typeof req.body === 'string' ? req.body : '');

      const signature = req.headers['x-hub-signature-256'] as string | undefined;
      const secret = process.env.WHATSAPP_APP_SECRET;

      if (!signature || !secret) {
        console.warn(
          '[webhook] Missing signature or WHATSAPP_APP_SECRET in server/.env.'
        );
        res.sendStatus(401);
        return;
      }

      const expectedSig =
        'sha256=' +
        crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

      const sigBuf = Buffer.from(signature);
      const expectedBuf = Buffer.from(expectedSig);

      if (
        sigBuf.length !== expectedBuf.length ||
        !crypto.timingSafeEqual(sigBuf, expectedBuf)
      ) {
        console.warn('[webhook] Signature mismatch on incoming webhook payload.');
        res.sendStatus(401);
        return;
      }

      // Acknowledge receipt immediately as required by Meta
      res.status(200).send('EVENT_RECEIVED');

      // Process message asynchronously
      processIncomingPayload(rawBody.toString('utf-8')).catch((err) => {
        console.error('[webhook] Error handling webhook payload:', err);
      });
    }
  );

  return app;
}

async function processIncomingPayload(payloadStr: string): Promise<void> {
  let parsed: any;
  try {
    parsed = JSON.parse(payloadStr);
  } catch {
    return;
  }

  const entries = Array.isArray(parsed?.entry) ? parsed.entry : [];
  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      const value = change?.value;
      const messages = Array.isArray(value?.messages) ? value.messages : [];

      for (const msg of messages) {
        const msgId = msg?.id;
        if (!msgId || recordProcessedMessageId(msgId)) {
          continue;
        }

        // Only text messages
        if (msg.type !== 'text' || !msg.text?.body) {
          continue;
        }

        const sender = String(msg.from || '').trim();
        const expectedTo = (process.env.WHATSAPP_TO || '').trim();
        const expectedFromId = (process.env.WHATSAPP_FROM_ID || '').trim();

        // Check sender
        const isAuthorizedSender =
          (expectedTo && sender === expectedTo) ||
          (expectedFromId && sender === expectedFromId);

        if (!isAuthorizedSender) {
          console.log(
            `[webhook] Ignored message from unlisted sender "${sender}" (set WHATSAPP_FROM_ID=${sender} in server/.env if this is your sender ID).`
          );
          continue;
        }

        const bodyText = String(msg.text.body || '').trim();
        const firstWord = bodyText.split(/\s+/)[0]?.toLowerCase();

        await handleWhatsAppCommand(firstWord);
      }
    }
  }
}

async function handleWhatsAppCommand(command: string): Promise<void> {
  const db = getDB();
  const runnerStatus = runner.status();

  if (command === 'status') {
    const queued = db.jobs.filter((j) => j.status === 'queued').length;
    const applied = db.jobs.filter((j) => j.status === 'applied').length;
    const needYou = db.jobs.filter((j) => j.status === 'needs_you').length;
    const emailsToApprove = db.jobs.filter(
      (j) =>
        j.kind === 'email' &&
        (j.status === 'review' || j.status === 'needs_you')
    ).length;
    const failed = db.jobs.filter((j) => j.status === 'failed').length;

    let stateText = 'Runner is stopped.';
    if (runnerStatus.running) {
      if (runnerStatus.waitingOn) {
        stateText = 'Paused until you answer waiting job.';
      } else if (runnerStatus.currentJobId) {
        const cur = db.jobs.find((j) => j.id === runnerStatus.currentJobId);
        stateText = `Working on ${cur?.title || 'a job'}.`;
      } else {
        stateText = 'Running (waiting between jobs).';
      }
    }

    const reply = `${stateText}\nQueued: ${queued} | Applied: ${applied} | Need you: ${needYou} | Emails to approve: ${emailsToApprove} | Failed: ${failed}`;
    await sendWhatsAppReply(reply);
    return;
  }

  if (command === 'stop') {
    runner.stop();
    await sendWhatsAppReply('Runner stopped.');
    return;
  }

  if (command === 'start') {
    if (!db.cv) {
      await sendWhatsAppReply('Cannot start: upload your CV in dashboard first.');
      return;
    }
    if (
      !(db.profile.firstName || db.profile.lastName) ||
      !db.profile.email ||
      !db.profile.phone
    ) {
      await sendWhatsAppReply(
        'Cannot start: add your name, email and phone in dashboard first.'
      );
      return;
    }
    const hasQueued = db.jobs.some(
      (j) => j.status === 'queued' && (j.kind === 'form' || j.kind === 'email')
    );
    if (!hasQueued) {
      await sendWhatsAppReply('Cannot start: add some jobs in dashboard first.');
      return;
    }

    runner.start();
    await sendWhatsAppReply('Started applying.');
    return;
  }

  // Job-specific commands
  const waitingId = runnerStatus.waitingOn;
  const isJobCommand = ['skip', 'done', 'retry', 'submit'].includes(command);

  if (isJobCommand) {
    if (!waitingId) {
      await sendWhatsAppReply('Nothing is waiting on you right now.');
      return;
    }

    const job = db.jobs.find((j) => j.id === waitingId);
    if (!job) {
      await sendWhatsAppReply('Nothing is waiting on you right now.');
      return;
    }

    // Email jobs cannot be sent from WhatsApp
    if (job.kind === 'email') {
      await sendWhatsAppReply('Emails are approved in the dashboard.');
      return;
    }

    if (command === 'submit') {
      if (job.status === 'needs_you') {
        await sendWhatsAppReply(
          'That job has required fields only you can fill. Open the dashboard.'
        );
        return;
      }

      if (job.status === 'review') {
        if (!job.actions || !job.actions.includes('submit')) {
          await sendWhatsAppReply('Submit action is not available for this job.');
          return;
        }
        updateJob(job.id, { message: 'Submitted from WhatsApp' });
        await runner.decide(waitingId, 'submit');
        await sendWhatsAppReply('Submitting application…');
        return;
      }
    }

    const decisionMap: Record<string, Decision> = {
      skip: 'skip',
      done: 'done',
      retry: 'refill'
    };

    const targetDecision = decisionMap[command];
    if (targetDecision) {
      if (!job.actions || !job.actions.includes(targetDecision)) {
        await sendWhatsAppReply(
          `Action "${command}" is not available for this job.`
        );
        return;
      }

      const note =
        command === 'skip'
          ? 'Skipped from WhatsApp'
          : command === 'done'
          ? 'Marked as applied from WhatsApp'
          : 'Retrying from WhatsApp';

      updateJob(job.id, { message: note });
      await runner.decide(waitingId, targetDecision);
      await sendWhatsAppReply(`Action executed: ${command}.`);
      return;
    }
  }

  // Fallback: list of supported commands
  const helpText = [
    'Job Autopilot Commands:',
    '• status - check queue and runner status',
    '• retry - retry filling the current form',
    '• submit - submit reviewed form',
    '• done - mark form as applied',
    '• skip - skip current job',
    '• start - start applying',
    '• stop - stop applying'
  ].join('\n');

  await sendWhatsAppReply(helpText);
}

export function startWebhookServer(): any {
  if (!isWebhookEnabled()) {
    return null;
  }

  const app = createWebhookApp();
  const port = process.env.WEBHOOK_PORT || 4100;

  const server = app.listen(port, () => {
    console.log(
      `[webhook] WhatsApp interactive webhook listening on http://localhost:${port}`
    );
  });

  return server;
}
