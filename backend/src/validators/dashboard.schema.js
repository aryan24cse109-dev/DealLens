import { z } from 'zod';

const dateQuerySchema = z
  .coerce
  .date()
  .refine((value) => !Number.isNaN(value.getTime()), 'Invalid date.');

export const dashboardQuerySchema = z
  .object({
    from: dateQuerySchema.optional(),
    to: dateQuerySchema.optional(),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  })
  .refine(
    (query) => !query.from || !query.to || query.from <= query.to,
    {
      message: '`from` must be earlier than or equal to `to`.',
      path: ['to'],
    },
  );
