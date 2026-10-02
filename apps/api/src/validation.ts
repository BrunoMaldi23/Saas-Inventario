import { BadRequestException } from '@nestjs/common';
import type { z } from 'zod';

export function parseBody<T extends z.ZodTypeAny>(
  schema: T,
  body: unknown,
): z.output<T> {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException({
      error: 'Invalid request',
      fields: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }
  return result.data;
}
