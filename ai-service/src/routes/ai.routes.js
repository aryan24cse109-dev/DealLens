
import { Router } from 'express';
import {
  runCommunicationGeneration,
  runImpactAnalysis,
} from '../controllers/ai.controller.js';
import { requireServiceAuth } from '../middleware/service-auth.middleware.js';

const router = Router();

router.post('/impact-analysis', requireServiceAuth, runImpactAnalysis);
router.post('/communications', requireServiceAuth, runCommunicationGeneration);

export default router;
