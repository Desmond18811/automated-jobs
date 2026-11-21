import { Router } from 'express';
import { asyncHandler } from '../lib/http';
import { TaxonomyController } from '../controllers/taxonomy.controller';

const router = Router();

// Taxonomy routes are open so onboarding candidates can retrieve options seamlessly
router.get('/roles', asyncHandler(TaxonomyController.getRoles));
router.get('/industries', asyncHandler(TaxonomyController.getIndustries));
router.get('/locations', asyncHandler(TaxonomyController.getLocations));
router.get('/skills', asyncHandler(TaxonomyController.getSkills));
router.get('/skills/catalog', asyncHandler(TaxonomyController.getSkillCatalog));
router.get('/fields', asyncHandler(TaxonomyController.getFields));
router.post('/request', asyncHandler(TaxonomyController.requestOption));

export default router;
