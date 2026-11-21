import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../lib/http';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { ProfileController } from '../controllers/profile.controller';
import { CV_MIME } from '../services/documents/cvParser';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype === CV_MIME.pdf || file.mimetype === CV_MIME.docx),
});

// CV parsing allows optional auth (candidates can parse during onboarding even before session finalization)
router.post('/cv', optionalAuth, upload.single('cv'), asyncHandler(ProfileController.uploadCv));

// Authenticated profile endpoints
router.get('/', requireAuth, asyncHandler(ProfileController.getProfile));
router.put('/', requireAuth, asyncHandler(ProfileController.updateProfile));
router.post('/verify', requireAuth, asyncHandler(ProfileController.verify));
router.post('/career-pages', requireAuth, asyncHandler(ProfileController.addCareerPage));
router.delete('/career-pages', requireAuth, asyncHandler(ProfileController.removeCareerPage));

export default router;
