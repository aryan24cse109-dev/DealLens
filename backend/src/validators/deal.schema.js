
import { z } from 'zod';

export const createDealSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Deal name must be at least 2 characters')
    .max(200, 'Deal name cannot exceed 200 characters'),

  description: z
    .string()
    .trim()
    .max(2000, 'Description cannot exceed 2000 characters')
    .optional()
    .nullable(),
});

export const updateDealSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Deal name must be at least 2 characters')
      .max(200, 'Deal name cannot exceed 200 characters')
      .optional(),

    description: z
      .string()
      .trim()
      .max(2000, 'Description cannot exceed 2000 characters')
      .optional()
      .nullable(),

    status: z
      .enum(['DRAFT', 'PROCESSING', 'ANALYZED', 'FAILED'])
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });
