import crypto from 'node:crypto';
import express, { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { AppError, asyncHandler, parseBody } from '../lib/http';
import { logger } from '../lib/logger';
import { taskIdFromReplyToken } from '../lib/replyToken';
import { Task } from '../models/task.model';
import { handleReply, handleWhatsAppText, publicTask } from '../services/reply.service';

/** Public (no login): the one-tap answer link and the WhatsApp inbound webhook. */
const router = Router();

async function taskFromToken(token: string) {
  const id = taskIdFromReplyToken(token);
  if (!id) throw new AppError(404, 'This link is not valid.');
  const task = await Task.findById(id);
  if (!task) throw new AppError(404, 'This request no longer exists.');
  return task;
}

router.get(
  '/reply/:token',
  asyncHandler(async (req, res) => {
    res.json(publicTask(await taskFromToken(req.params.token)));
  }),
);

const ReplyBody = z.object({
  action: z.enum(['answer', 'continue', 'submitted']),
  answers: z.record(z.string().max(5000)).optional(),
});

router.post(
  '/reply/:token',
  asyncHandler(async (req, res) => {
    const task = await taskFromToken(req.params.token);
    const body = parseBody(ReplyBody, req.body);
    await handleReply(task, body.action, body.answers);
    res.json(publicTask((await Task.findById(task.id))!));
  }),
);

/** Twilio signs each webhook: base64(HMAC-SHA1(authToken, url + sorted key/value pairs)). */
function validTwilioSignature(url: string, params: Record<string, string>, signature: string | undefined): boolean {
  if (!env.TWILIO_AUTH_TOKEN) return true; // not configured: dev only
  if (!signature) return false;
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join('');
  const expected = crypto.createHmac('sha1', env.TWILIO_AUTH_TOKEN).update(data).digest('base64');
  return expected.length === signature.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

const xml = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);

router.post(
  '/webhooks/whatsapp/twilio',
  express.urlencoded({ extended: false }),
  asyncHandler(async (req, res) => {
    const params = req.body as Record<string, string>;
    // Twilio signs the public URL it called (your ngrok/cloudflared URL = API_URL).
    const url = `${env.API_URL.replace(/\/$/, '')}${req.originalUrl}`;
    if (!validTwilioSignature(url, params, req.header('X-Twilio-Signature'))) {
      logger.warn({ url }, 'Rejected WhatsApp webhook with a bad Twilio signature');
      throw new AppError(403, 'Bad signature');
    }
    const reply = await handleWhatsAppText(String(params.From ?? ''), String(params.Body ?? ''));
    res.type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${xml(reply)}</Message></Response>`);
  }),
);

export default router;
