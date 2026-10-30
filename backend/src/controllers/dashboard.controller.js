import { dashboardQuerySchema } from '../validators/dashboard.schema.js';
import { dashboardService } from '../services/dashboard.service.js';

export const dashboardController = {
  async getSummary(req, res, next) {
    try {
      const query = dashboardQuerySchema.parse(req.query);
      const data = await dashboardService.getSummary(query);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return next(error);
    }
  },
};
