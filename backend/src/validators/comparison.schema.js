
import { z } from 'zod';

const documentIdSchema = z.string()
  .trim()
  .min(1, 'Document ID is required')
  .max(100, 'Document ID is too long');

export const compareDocumentsSchema = z.object({
  originalDocumentId: documentIdSchema,
  revisedDocumentId: documentIdSchema,
}).refine(
  (data) => data.originalDocumentId !== data.revisedDocumentId,
  {
    message: 'Original and revised documents must be different',
    path: ['revisedDocumentId'],
  }
);
