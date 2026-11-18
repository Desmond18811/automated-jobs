import { Router } from 'express';
import { TestController } from '../controllers/test.controller';

const router = Router();

router.post('/form-fill', TestController.testFormFill);
router.post('/whatsapp', TestController.testWhatsAppAlert);
router.post('/e2e-apply', TestController.testE2EApplyFlow);
router.post('/stripe-tailored-apply', TestController.testStripeTailoredApply);

export default router;
