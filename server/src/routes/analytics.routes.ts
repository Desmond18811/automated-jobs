import { Router } from 'express';
import { asyncHandler } from '../lib/http';
import { AnalyticsController } from '../controllers/analytics.controller';

const router = Router();

router.get('/overview', asyncHandler(AnalyticsController.overview));
router.get('/funnel', asyncHandler(AnalyticsController.getFunnel));

export default router;
