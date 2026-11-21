import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { AuthController } from '../controllers/auth.controller';

const router = Router();
const strict = rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false });

// Passwordless sign-in: email -> (link + code) -> session.
router.post('/start', strict, asyncHandler(AuthController.start));
router.post('/link', strict, asyncHandler(AuthController.openLink));
router.post('/verify', strict, asyncHandler(AuthController.verify));

router.post('/refresh', asyncHandler(AuthController.refresh));
router.post('/logout', asyncHandler(AuthController.logout));
router.post('/logout-all', requireAuth, asyncHandler(AuthController.logoutAll));
router.get('/sessions', requireAuth, asyncHandler(AuthController.sessions));
router.delete('/sessions/:id', requireAuth, asyncHandler(AuthController.revokeSession));
router.put('/onboarding-stage', requireAuth, asyncHandler(AuthController.updateOnboardingStage));
router.get('/me', requireAuth, asyncHandler(AuthController.me));

export default router;
