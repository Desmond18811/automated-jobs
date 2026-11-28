import { Router } from 'express';
import { currentUser } from '../middleware/auth';
import { asyncHandler } from '../lib/http';
import { createLinkUrl, sendTelegramAlert, telegramStatus, unlinkTelegram } from '../services/telegram.service';

const router = Router();

/** Whether the bot is set up and this account's chat is connected. */
router.get('/', asyncHandler(async (req, res) => res.json(await telegramStatus(currentUser(req)))));

/** A one-time t.me link; tapping Start in the bot connects the chat. */
router.post('/link', asyncHandler(async (req, res) => res.json(await createLinkUrl(currentUser(req)))));

router.delete('/link', asyncHandler(async (req, res) => {
  await unlinkTelegram(currentUser(req));
  res.json(await telegramStatus(currentUser(req)));
}));

/** Sends a test message to the connected chat. */
router.post('/test', asyncHandler(async (req, res) => {
  const r = await sendTelegramAlert(currentUser(req), {
    type: 'test',
    title: 'J.A.V.I is connected',
    body: 'Alerts and questions will arrive here. When J.A.V.I needs an answer, tap a button or reply to its message.',
  });
  res.status(r.sent ? 200 : 409).json(r.sent ? r : { error: r.error === 'Telegram not connected' ? 'Connect Telegram first.' : r.error, ...r });
}));

export default router;
