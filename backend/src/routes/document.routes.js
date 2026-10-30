
import { Router } from 'express';
import { uploadDocument } from '../middleware/upload.middleware.js';
import { documentController } from '../controllers/document.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireSameOrigin } from '../middleware/csrf.middleware.js';

const router = Router();
router.use(requireAuth, requireSameOrigin);

router.post(
  '/deals/:dealId/documents',
  uploadDocument.single('file'),
  documentController.upload,
);

router.get(
  '/deals/:dealId/documents',
  documentController.listByDeal,
);

router.get('/documents/:id', documentController.getById);

router.delete('/documents/:id', documentController.remove);

export default router;
