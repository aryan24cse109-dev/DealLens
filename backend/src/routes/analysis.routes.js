import { Router } from 'express';
import { analysisController } from '../controllers/analysis.controller.js';

const router = Router();

router.post('/:analysisId/ai-impact', analysisController.runAiImpact);

export default router;