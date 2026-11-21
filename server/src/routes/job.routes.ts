import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../lib/http';
import { JobController } from '../controllers/job.controller';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.get('/', asyncHandler(JobController.list));
router.post('/manual', asyncHandler(JobController.manual));
router.post('/links', asyncHandler(JobController.links));
router.post('/import', upload.single('file'), asyncHandler(JobController.importJobs));
router.get('/:id', asyncHandler(JobController.getJob));

export default router;
