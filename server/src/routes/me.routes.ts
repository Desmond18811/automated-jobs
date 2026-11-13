import { Router } from 'express';
import { asyncHandler } from '../lib/http';
import { MeController } from '../controllers/me.controller';

const router = Router();

router.get('/export', asyncHandler(MeController.exportData));
router.delete('/', asyncHandler(MeController.deleteAccount));

export default router;
