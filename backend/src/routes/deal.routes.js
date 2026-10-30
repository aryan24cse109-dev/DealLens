import { Router } from 'express';
import { dealController } from '../controllers/deal.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireSameOrigin } from '../middleware/csrf.middleware.js';

const router = Router();

router.use(requireAuth, requireSameOrigin);
router.post('/', dealController.create);
router.get('/', dealController.list);
router.get('/:id', dealController.getById);
router.patch('/:id', dealController.update);
router.delete('/:id', dealController.remove);

export default router;