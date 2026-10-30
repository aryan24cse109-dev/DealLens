
import { Router } from 'express';
import { comparisonController } from '../controllers/comparison.controller.js';

const router = Router();

router.post('/compare', comparisonController.compare);

export default router;
