
import { prisma } from '../config/database.js';

export const documentRepository = {
  create(data) {
    return prisma.document.create({ data });
  },

  findByDealId(dealId, ownerId) {
    return prisma.document.findMany({
      where: { dealId, deal: { ownerId } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        dealId: true,
        type: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        extractedText: true,
        createdAt: true,
      },
    });
  },

  findById(id, ownerId) {
    return prisma.document.findFirst({
      where: { id, deal: { ownerId } },
    });
  },

  deleteById(id, ownerId) {
    return prisma.document.deleteMany({
      where: { id, deal: { ownerId } },
    });
  },
};
