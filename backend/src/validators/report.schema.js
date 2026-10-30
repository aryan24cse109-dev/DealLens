import { z } from 'zod';

export const reportFormatSchema = z.enum(['PDF', 'JSON']);

export const createReportSchema = z.object({
  title: z.string().trim().min(1).max(200).default('DealLens Analysis Report'),
  format: reportFormatSchema.default('PDF'),
});
