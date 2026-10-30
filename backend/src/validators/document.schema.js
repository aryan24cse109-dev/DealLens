
import { z } from 'zod';

export const documentUploadSchema = z.object({
  type: z
    .enum(['ORIGINAL', 'REVISED', 'SUPPORTING'])
    .default('ORIGINAL'),
});
