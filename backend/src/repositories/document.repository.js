
import { prisma } from '../config/database.js';

export const documentRepository = {
  create(data) {
    return prisma.document.create({ data });
  },

  findByDealId(dealId) {
    return prisma.document.findMany({
      where: { dealId },
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

  findById(id) {
    return prisma.document.findUnique({
      where: { id },
    });
  },

  deleteById(id) {
    return prisma.document.delete({
      where: { id },
    });
  },
};
