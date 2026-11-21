import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../lib/http';
import { BusinessController as C } from '../controllers/business.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/services', asyncHandler(C.getServices));
router.put('/services', asyncHandler(C.putServices));
router.get('/catalog', asyncHandler(C.catalog));

router.post('/leads/search', asyncHandler(C.search));
router.post('/leads/import', upload.single('file'), asyncHandler(C.importLeads));
router.post('/leads', asyncHandler(C.add));
router.get('/leads', asyncHandler(C.list));
router.get('/leads/:id', asyncHandler(C.get));
router.patch('/leads/:id', asyncHandler(C.patch));
router.delete('/leads/:id', asyncHandler(C.remove));
router.post('/leads/:id/audit', asyncHandler(C.audit));
router.post('/leads/:id/quote', asyncHandler(C.quote));
router.post('/leads/:id/pitch', asyncHandler(C.pitch));
router.get('/leads/:id/scripts', asyncHandler(C.scripts));
router.post('/leads/:id/status', asyncHandler(C.status));

export default router;
