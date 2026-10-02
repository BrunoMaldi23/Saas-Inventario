import { z } from 'zod';

export const healthResponseSchema = z.object({ status: z.literal('ok') });
export const databaseHealthResponseSchema = z.object({
  status: z.enum(['ok', 'error']),
});
