import { prisma } from '../config/database.js';

export const dealRepository = {
  create(data) {
    return prisma.deal.create({ data });
  },

  findMany({ skip, take, search, ownerId }) {
    const ownership = { ownerId };
    return prisma.deal.findMany({
      where: search
        ? {
            ...ownership,
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : ownership,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  },

  count(search, ownerId) {
    return prisma.deal.count({
      where: search
        ? {
            ownerId,
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : { ownerId },
    });
  },

  findById(id, ownerId) {
    return prisma.deal.findFirst({
      where: { id, ownerId },
      include: {
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        analyses: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            summary: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
  },

  update(id, ownerId, data) {
    return prisma.deal.updateMany({
      where: { id, ownerId },
      data,
    });
  },

  delete(id, ownerId) {
    return prisma.deal.deleteMany({ where: { id, ownerId } });
  },
};