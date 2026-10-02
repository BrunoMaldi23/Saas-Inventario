import 'reflect-metadata';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { parseServerEnvironment } from '@inventario/config';
import { AppModule } from './app.module';

config({ path: resolve(process.cwd(), '../../.env') });

async function bootstrap(): Promise<void> {
  const environment = parseServerEnvironment(process.env);
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  await app.listen(environment.API_PORT);
}

void bootstrap();
