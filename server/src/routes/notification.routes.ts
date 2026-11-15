import { Router } from 'express';
import { asyncHandler } from '../lib/http';
import { NotificationController } from '../controllers/notification.controller';

const router = Router();

router.get('/', asyncHandler(NotificationController.list));
router.get('/unread-count', asyncHandler(NotificationController.unreadCount));
router.post('/read-all', asyncHandler(NotificationController.markAllRead));
router.post('/:id/read', asyncHandler(NotificationController.markRead));
router.patch('/:id/read', asyncHandler(NotificationController.markRead));
router.delete('/:id', asyncHandler(NotificationController.delete));
router.delete('/', asyncHandler(NotificationController.clearAll));
router.post('/', asyncHandler(NotificationController.create));

export default router;
