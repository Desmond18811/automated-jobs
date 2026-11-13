import { Router } from 'express';
import { asyncHandler } from '../lib/http';
import { TaskController } from '../controllers/task.controller';

const router = Router();

router.get('/', asyncHandler(TaskController.list));
router.post('/:id/answer', asyncHandler(TaskController.answer));
router.post('/:id/done', asyncHandler(TaskController.markDone));
router.post('/:id/retry', asyncHandler(TaskController.retry));
router.post('/:id/dismiss', asyncHandler(TaskController.dismiss));

export default router;
