import type { DatabaseHealthResponse, HealthResponse } from '@inventario/types';
import {
  databaseHealthResponseSchema,
  healthResponseSchema,
} from '@inventario/validation';

async function getJson(path: string): Promise<unknown> {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok)
    throw new Error(`Health request failed: ${response.status}`);
  return response.json();
}

export async function getApiHealth(): Promise<HealthResponse> {
  return healthResponseSchema.parse(await getJson('/api/v1/health'));
}

export async function getDatabaseHealth(): Promise<DatabaseHealthResponse> {
  return databaseHealthResponseSchema.parse(
    await getJson('/api/v1/health/database'),
  );
}
