import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { DatabaseHealthResponse, HealthResponse } from '@inventario/types';
import { HealthService } from './health.service';
import { Public } from './access.decorators';

@Public()
@Controller('health')
export class HealthController {
  constructor(@Inject(HealthService) private readonly health: HealthService) {}

  @Get()
  api(): HealthResponse {
    return this.health.api();
  }

  @Get('database')
  async database(): Promise<DatabaseHealthResponse> {
    const result = await this.health.databaseStatus();
    if (result.status === 'error') {
      throw new ServiceUnavailableException(result);
    }
    return result;
  }
}
