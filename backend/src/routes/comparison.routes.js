
import { Router } from 'express';
import { comparisonController } from '../controllers/comparison.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireSameOrigin } from '../middleware/csrf.middleware.js';

const router = Router();
router.use(requireAuth, requireSameOrigin);

router.post('/compare', comparisonController.compare);

export default router;
