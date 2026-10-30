import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireSameOrigin } from '../middleware/csrf.middleware.js';

const router = Router();
router.use(requireAuth, requireSameOrigin);

router.get('/', dashboardController.getSummary);

export default router;
