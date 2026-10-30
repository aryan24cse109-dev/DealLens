import { prisma } from '../config/database.js';

export const dealRepository = {
  create(data) {
    return prisma.deal.create({ data });
  },

  findMany({ skip, take, search }) {
    return prisma.deal.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  },

  count(search) {
    return prisma.deal.count({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
    });
  },

  findById(id) {
    return prisma.deal.findUnique({
      where: { id },
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

  update(id, data) {
    return prisma.deal.update({
      where: { id },
      data,
    });
  },

  delete(id) {
    return prisma.deal.delete({
      where: { id },
    });
  },
};