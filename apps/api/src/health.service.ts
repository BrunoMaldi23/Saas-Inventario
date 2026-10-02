import { Inject, Injectable } from '@nestjs/common';
import type { DatabaseHealthResponse, HealthResponse } from '@inventario/types';
import { DatabaseService } from './database.service';

@Injectable()
export class HealthService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  api(): HealthResponse {
    return { status: 'ok' };
  }

  async databaseStatus(): Promise<DatabaseHealthResponse> {
    return { status: (await this.database.isAvailable()) ? 'ok' : 'error' };
  }
}
