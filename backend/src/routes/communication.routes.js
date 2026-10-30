import { Router } from 'express';
import { communicationController } from '../controllers/communication.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireSameOrigin } from '../middleware/csrf.middleware.js';

const router = Router();
router.use(requireAuth, requireSameOrigin);

router.post(
  '/analyses/:analysisId/communications',
  communicationController.create,
);
router.get(
  '/analyses/:analysisId/communications',
  communicationController.list,
);
router.get('/communications/:draftId', communicationController.get);
router.patch('/communications/:draftId', communicationController.update);
router.delete('/communications/:draftId', communicationController.remove);

export default router;
