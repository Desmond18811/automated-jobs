import { Router } from 'express';
import { asyncHandler } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { GmailController } from '../controllers/gmail.controller';

const router = Router();

router.get('/connect', requireAuth, asyncHandler(GmailController.connect));
router.get('/callback', asyncHandler(GmailController.callback));
router.delete('/', requireAuth, asyncHandler(GmailController.disconnect));

export default router;
