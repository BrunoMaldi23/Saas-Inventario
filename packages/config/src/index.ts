import { z } from 'zod';

const serverEnvironmentSchema = z.object({
  DATABASE_URL: z
    .string()
    .url()
    .refine(
      (url) => url.startsWith('postgresql://') || url.startsWith('postgres://'),
      'Must be a PostgreSQL URL',
    ),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

export function parseServerEnvironment(
  environment: NodeJS.ProcessEnv,
): ServerEnvironment {
  return serverEnvironmentSchema.parse(environment);
}
