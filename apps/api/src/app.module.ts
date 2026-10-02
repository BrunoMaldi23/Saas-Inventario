import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AdminService } from './admin.service';
import {
  MembershipsController,
  RolesController,
  UsersController,
} from './admin.controller';
import { AuthController, TenantsController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { CsrfGuard } from './csrf.guard';
import { DatabaseService } from './database.service';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PermissionGuard } from './permission.guard';
import { TenantGuard } from './tenant.guard';

@Module({
  controllers: [
    HealthController,
    AuthController,
    TenantsController,
    RolesController,
    UsersController,
    MembershipsController,
  ],
  providers: [
    DatabaseService,
    HealthService,
    AuthService,
    AdminService,
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(cookieParser()).forRoutes('*');
  }
}
