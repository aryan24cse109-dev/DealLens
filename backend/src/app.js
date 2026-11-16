
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

import documentRoutes from './routes/document.routes.js';
import healthRoutes from './routes/health.routes.js';
import dealRoutes from './routes/deal.routes.js';
import comparisonRoutes from './routes/comparison.routes.js';
import analysisRoutes from './routes/analysis.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import reportRoutes from './routes/report.routes.js';
import communicationRoutes from './routes/communication.routes.js';
import authRoutes from './routes/auth.routes.js';

const app = express();

// Core middleware
app.use(helmet());
app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Public backend homepage
app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    service: 'DealLens Backend API',
    status: 'running',
    message: 'DealLens backend is running successfully.',
    health: '/api/v1/health',
    api: '/api/v1',
  });
});

// Public API welcome route.
// Keep this BEFORE protected routers so their auth middleware
// cannot intercept GET /api/v1.
app.get('/api/v1', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to the DealLens API.',
  });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/analyses', analysisRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1', reportRoutes);
app.use('/api/v1', communicationRoutes);
app.use('/api/v1/comparisons', comparisonRoutes);
app.use('/api/v1', documentRoutes);
app.use('/api/v1/deals', dealRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Central error handler
app.use((err, req, res, next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors: err.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2025'
  ) {
    return res.status(404).json({
      success: false,
      message: 'Requested record not found.',
    });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: `File exceeds the ${env.maxFileSizeMb} MB upload limit.`,
    });
  }

  if (err.status && err.status < 500) {
    return res.status(err.status).json({
      success: false,
      message: err.message,
    });
  }

  return res.status(500).json({
    success: false,
    message: 'Internal server error.',
  });
});

export default app;
