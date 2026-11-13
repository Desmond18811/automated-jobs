import { Router } from 'express';
import { asyncHandler } from '../lib/http';
import { NotificationController } from '../controllers/notification.controller';

const router = Router();

router.get('/', asyncHandler(NotificationController.list));
router.post('/read-all', asyncHandler(NotificationController.markAllRead));

export default router;
