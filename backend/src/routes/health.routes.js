import { Router } from 'express';
import { prisma } from '../config/database.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      success: true,
      message: 'DealLens backend is running.',
      services: {
        api: 'healthy',
        database: 'connected',
      },
    });
  } catch {
    res.status(503).json({
      success: false,
      message: 'Backend is running, but the database is unavailable.',
      services: {
        api: 'healthy',
        database: 'unavailable',
      },
    });
  }
});

export default router;
