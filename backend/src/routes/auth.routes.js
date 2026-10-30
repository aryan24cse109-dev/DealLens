import { Router } from 'express';
import { authController, authErrorHandler } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireSameOrigin } from '../middleware/csrf.middleware.js';

const router = Router();

router.get('/google', authController.startGoogle);
router.get('/google/callback', authController.googleCallback);
router.get('/me', requireAuth, authController.me);
router.post('/logout', requireSameOrigin, authController.logout);
router.use(authErrorHandler);

export default router;
