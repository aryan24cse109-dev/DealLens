
import { Router } from 'express';
import { uploadDocument } from '../middleware/upload.middleware.js';
import { documentController } from '../controllers/document.controller.js';

const router = Router();

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
