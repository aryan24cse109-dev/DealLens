import { dealRepository } from '../repositories/deal.repository.js';

export class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = 'AppError';
    this.status = status;
  }
}

export const dealService = {
  async createDeal(ownerId, input) {
    return dealRepository.create({
      ownerId,
      name: input.name,
      description: input.description ?? null,
    });
  },

  async listDeals({ page = 1, limit = 10, search = '', ownerId }) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
    const normalizedSearch = String(search).trim();

    const [items, total] = await Promise.all([
      dealRepository.findMany({
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        search: normalizedSearch,
        ownerId,
      }),
      dealRepository.count(normalizedSearch, ownerId),
    ]);

    return {
      items,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  },

  async getDeal(ownerId, id) {
    const deal = await dealRepository.findById(id, ownerId);

    if (!deal) {
      throw new AppError('Deal not found.', 404);
    }

    return deal;
  },

  async updateDeal(ownerId, id, input) {
    const result = await dealRepository.update(id, ownerId, input);
    if (!result.count) throw new AppError('Deal not found.', 404);
    return this.getDeal(ownerId, id);
  },

  async deleteDeal(ownerId, id) {
    const result = await dealRepository.delete(id, ownerId);
    if (!result.count) throw new AppError('Deal not found.', 404);

    return { id, deleted: true };
  },
};