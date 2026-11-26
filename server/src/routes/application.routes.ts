import { Router } from 'express';
import { asyncHandler } from '../lib/http';
import { ApplicationController } from '../controllers/application.controller';

const router = Router();

router.get('/', asyncHandler(ApplicationController.list));
router.get('/interviews', asyncHandler(ApplicationController.interviews));
router.get('/activity', asyncHandler(ApplicationController.activity));
router.get('/:id', asyncHandler(ApplicationController.getOne));
router.patch('/:id/documents', asyncHandler(ApplicationController.updateDocuments));
router.post('/:id/approve', asyncHandler(ApplicationController.approve));
router.post('/:id/regenerate', asyncHandler(ApplicationController.regenerate));
router.post('/:id/archive', asyncHandler(ApplicationController.archive));
router.post('/:id/status', asyncHandler(ApplicationController.updateStatus));

export default router;
