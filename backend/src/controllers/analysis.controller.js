
import {
  analysisService,
  AnalysisServiceError,
} from '../services/analysis.service.js';

import { AiServiceError } from '../services/ai.service.js';
import { z } from 'zod';

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).default(''),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED']).optional(),
}).strict();

export const analysisController = {
  async list(req, res, next) {
    try {
      const query = listQuerySchema.parse(req.query);
      const result = await analysisService.listAnalyses({
        ...query,
        ownerId: req.user.id,
      });
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  },

  async get(req, res, next) {
    try {
      const result = await analysisService.getAnalysis(
        req.params.analysisId,
        req.user.id,
      );
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      if (error instanceof AnalysisServiceError) {
        return res.status(error.status).json({
          success: false,
          message: error.message,
          retryAfterMs: error.retryAfterMs || null,
        });
      }
      return next(error);
    }
  },

  async runAiImpact(req, res, next) {
    try {
      const { analysisId } = req.params;

      const result = await analysisService.runAiImpact(analysisId, req.user.id);

      return res.status(200).json({
        success: true,
        message: 'AI impact analysis completed.',
        data: result,
      });
    } catch (error) {
      if (
        error instanceof AnalysisServiceError ||
        error instanceof AiServiceError
      ) {
        return res.status(error.status).json({
          success: false,
          message: error.message,
        });
      }

      return next(error);
    }
  },
};
