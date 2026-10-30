import { Router } from 'express';
import { analysisController } from '../controllers/analysis.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireSameOrigin } from '../middleware/csrf.middleware.js';

const router = Router();
router.use(requireAuth, requireSameOrigin);

router.post('/:analysisId/ai-impact', analysisController.runAiImpact);

export default router;