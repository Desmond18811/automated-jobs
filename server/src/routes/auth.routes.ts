import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { AuthController } from '../controllers/auth.controller';

const router = Router();
const strict = rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false });

router.post('/register', strict, asyncHandler(AuthController.register));
router.post('/login', strict, asyncHandler(AuthController.login));
router.post('/google', strict, asyncHandler(AuthController.googleLogin));
router.post('/verify-otp', strict, asyncHandler(AuthController.verifyOtp));
router.post('/resend-otp', strict, asyncHandler(AuthController.resendOtp));
router.post('/forgot-password', strict, asyncHandler(AuthController.forgotPassword));
router.post('/reset-password', strict, asyncHandler(AuthController.resetPassword));
router.put('/onboarding-stage', requireAuth, asyncHandler(AuthController.updateOnboardingStage));
router.post('/refresh', asyncHandler(AuthController.refresh));
router.post('/logout', asyncHandler(AuthController.logout));
router.get('/me', requireAuth, asyncHandler(AuthController.me));

export default router;
