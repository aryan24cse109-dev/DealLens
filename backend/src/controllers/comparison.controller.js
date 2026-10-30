
import { compareDocumentsSchema } from '../validators/comparison.schema.js';
import {
  comparisonService,
  ComparisonServiceError,
} from '../services/comparison.service.js';

export const comparisonController = {
  async compare(req, res, next) {
    try {
      const input = compareDocumentsSchema.parse(req.body);

      const result = await comparisonService.compareDocuments(input, req.user.id);

      return res.status(201).json({
        success: true,
        message: 'Documents compared successfully.',
        data: result,
      });
    } catch (error) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid comparison request.',
          errors: error.issues,
        });
      }

      if (error instanceof ComparisonServiceError) {
        return res.status(error.status).json({
          success: false,
          message: error.message,
        });
      }

      return next(error);
    }
  },
};
