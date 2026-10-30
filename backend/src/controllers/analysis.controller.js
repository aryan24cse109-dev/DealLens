
import {
  analysisService,
  AnalysisServiceError,
} from '../services/analysis.service.js';

import { AiServiceError } from '../services/ai.service.js';

export const analysisController = {
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
