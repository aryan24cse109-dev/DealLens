import { AppError } from '../services/deal.service.js';
import { dealService } from '../services/deal.service.js';
import {
  createDealSchema,
  updateDealSchema,
} from '../validators/deal.schema.js';

function parseId(req) {
  const id = req.params.id;

  if (!id || id.length > 100) {
    throw new AppError('Invalid deal ID.', 400);
  }

  return id;
}

export const dealController = {
  async create(req, res, next) {
    try {
      const input = createDealSchema.parse(req.body);
      const deal = await dealService.createDeal(input);

      res.status(201).json({
        success: true,
        data: deal,
      });
    } catch (error) {
      next(error);
    }
  },

  async list(req, res, next) {
    try {
      const result = await dealService.listDeals({
        page: req.query.page,
        limit: req.query.limit,
        search: req.query.search,
      });

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const deal = await dealService.getDeal(parseId(req));

      res.status(200).json({
        success: true,
        data: deal,
      });
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const id = parseId(req);
      const input = updateDealSchema.parse(req.body);
      const deal = await dealService.updateDeal(id, input);

      res.status(200).json({
        success: true,
        data: deal,
      });
    } catch (error) {
      next(error);
    }
  },

  async remove(req, res, next) {
    try {
      const result = await dealService.deleteDeal(parseId(req));

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};