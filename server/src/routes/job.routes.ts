import { Router } from 'express';
import { asyncHandler } from '../lib/http';
import { JobController } from '../controllers/job.controller';

const router = Router();

router.post('/manual', asyncHandler(JobController.manual));
router.get('/:id', asyncHandler(JobController.getJob));

export default router;
