import { Router } from 'express';
import { communicationController } from '../controllers/communication.controller.js';

const router = Router();

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
