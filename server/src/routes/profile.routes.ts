import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../lib/http';
import { ProfileController } from '../controllers/profile.controller';
import { CV_MIME } from '../services/documents/cvParser';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype === CV_MIME.pdf || file.mimetype === CV_MIME.docx),
});

router.get('/', asyncHandler(ProfileController.getProfile));
router.post('/cv', upload.single('cv'), asyncHandler(ProfileController.uploadCv));
router.put('/', asyncHandler(ProfileController.updateProfile));
router.post('/verify', asyncHandler(ProfileController.verify));
router.post('/career-pages', asyncHandler(ProfileController.addCareerPage));
router.delete('/career-pages', asyncHandler(ProfileController.removeCareerPage));

export default router;
