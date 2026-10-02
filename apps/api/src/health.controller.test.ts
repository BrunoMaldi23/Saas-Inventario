import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { DatabaseService } from './database.service';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('health endpoints', () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  async function createApp(
    databaseAvailable: boolean,
  ): Promise<INestApplication> {
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        {
          provide: DatabaseService,
          useValue: { isAvailable: async () => databaseAvailable },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
    return app;
  }

  it('returns the expected API health response', async () => {
    const instance = await createApp(true);
    const response = await request(instance.getHttpServer())
      .get('/api/v1/health')
      .expect(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('reports an unavailable database with HTTP 503', async () => {
    const instance = await createApp(false);
    const response = await request(instance.getHttpServer())
      .get('/api/v1/health/database')
      .expect(503);
    expect(response.body).toEqual({ status: 'error' });
  });
});
