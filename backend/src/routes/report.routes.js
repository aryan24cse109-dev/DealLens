import { Router } from 'express';
import { reportController } from '../controllers/report.controller.js';

const router = Router();

router.post('/analyses/:analysisId/reports', reportController.create);
router.get('/analyses/:analysisId/reports', reportController.list);
router.get('/reports/:reportId/download', reportController.download);
router.get('/reports/:reportId', reportController.get);
router.delete('/reports/:reportId', reportController.remove);

export default router;
