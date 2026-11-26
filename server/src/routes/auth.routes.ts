import { Router, type RequestHandler } from 'express';
import { env } from '../config/env';
import { AppError } from '../lib/http';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { AuthController } from '../controllers/auth.controller';

const router = Router();

/** Cookie-authenticated POSTs must come from our own app, so another site cannot trigger them. */
const sameOrigin: RequestHandler = (req, _res, next) => {
  const origin = req.get('origin');
  if (!origin) return next(); // same-origin fetches via the dev proxy and non-browser clients
  const host = req.get('x-forwarded-host') || req.get('host');
  try {
    const o = new URL(origin);
    if (o.host === host || origin === env.APP_URL || (env.NODE_ENV !== 'production' && /^(localhost|127\.0\.0\.1)$/.test(o.hostname))) {
      return next();
    }
  } catch {
    /* fall through */
  }
  next(new AppError(403, 'Cross-site request blocked'));
};
const strict = rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false });

// Passwordless sign-in: email -> (link + code) -> session.
router.post('/start', strict, asyncHandler(AuthController.start));
router.post('/link', strict, asyncHandler(AuthController.openLink));
router.post('/verify', strict, asyncHandler(AuthController.verify));

router.post('/refresh', strict, sameOrigin, asyncHandler(AuthController.refresh));
router.post('/logout', strict, sameOrigin, asyncHandler(AuthController.logout));
router.post('/logout-all', requireAuth, asyncHandler(AuthController.logoutAll));
router.get('/sessions', requireAuth, asyncHandler(AuthController.sessions));
router.delete('/sessions/:id', requireAuth, asyncHandler(AuthController.revokeSession));
router.put('/onboarding-stage', requireAuth, asyncHandler(AuthController.updateOnboardingStage));
router.get('/me', requireAuth, asyncHandler(AuthController.me));

export default router;
