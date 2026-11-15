import { Router } from 'express';
import { asyncHandler } from '../lib/http';
import { BusinessController } from '../controllers/business.controller';

const router = Router();

router.post('/search', asyncHandler(BusinessController.search));
router.get('/leads', asyncHandler(BusinessController.list));
router.get('/leads/:id', asyncHandler(BusinessController.getLead));
router.post('/leads/:id/pitch', asyncHandler(BusinessController.generatePitch));
router.post('/leads/:id/sequence/start', asyncHandler(BusinessController.startSequence));
router.post('/leads/:id/sequence/pause', asyncHandler(BusinessController.pauseSequence));
router.post('/leads/:id/dismiss', asyncHandler(BusinessController.dismiss));

export default router;
