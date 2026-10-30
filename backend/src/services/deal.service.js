import { dealRepository } from '../repositories/deal.repository.js';

export class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = 'AppError';
    this.status = status;
  }
}

export const dealService = {
  async createDeal(input) {
    return dealRepository.create({
      name: input.name,
      description: input.description ?? null,
    });
  },

  async listDeals({ page = 1, limit = 10, search = '' }) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
    const normalizedSearch = String(search).trim();

    const [items, total] = await Promise.all([
      dealRepository.findMany({
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        search: normalizedSearch,
      }),
      dealRepository.count(normalizedSearch),
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

  async getDeal(id) {
    const deal = await dealRepository.findById(id);

    if (!deal) {
      throw new AppError('Deal not found.', 404);
    }

    return deal;
  },

  async updateDeal(id, input) {
    await this.getDeal(id);
    return dealRepository.update(id, input);
  },

  async deleteDeal(id) {
    await this.getDeal(id);
    await dealRepository.delete(id);

    return { id, deleted: true };
  },
};