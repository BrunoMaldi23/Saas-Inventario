import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import type { AuthSessionResponse, TenantsResponse } from '@inventario/types';
import {
  changePasswordRequestSchema,
  loginRequestSchema,
  selectTenantRequestSchema,
} from '@inventario/validation';
import { AuthService } from './auth.service';
import { NoTenant, Public } from './access.decorators';
import type { AccessRequest } from './access.context';
import { clearSessionCookie, setSessionCookie } from './session-cookie';
import { parseBody } from './validation';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthSessionResponse> {
    const input = parseBody(loginRequestSchema, body);
    const result = await this.authService.login(input.email, input.password);
    setSessionCookie(response, result.token);
    return result.body;
  }

  @NoTenant()
  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() request: AccessRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    if (!request.auth) throw new UnauthorizedException();
    await this.authService.logout(request.auth);
    clearSessionCookie(response);
  }

  @NoTenant()
  @Get('me')
  async me(@Req() request: AccessRequest): Promise<AuthSessionResponse> {
    if (!request.auth) throw new UnauthorizedException();
    return this.authService.me(request.auth);
  }

  @NoTenant()
  @Post('change-password')
  @HttpCode(204)
  async changePassword(
    @Req() request: AccessRequest,
    @Body() body: unknown,
  ): Promise<void> {
    if (!request.auth) throw new UnauthorizedException();
    await this.authService.changePassword(
      request.auth,
      parseBody(changePasswordRequestSchema, body),
    );
  }

  @NoTenant()
  @Post('select-tenant')
  @HttpCode(200)
  async selectTenant(
    @Body() body: unknown,
    @Req() request: AccessRequest,
  ): Promise<AuthSessionResponse> {
    if (!request.auth) throw new UnauthorizedException();
    return this.authService.selectTenant(
      request.auth,
      parseBody(selectTenantRequestSchema, body).tenantId,
    );
  }
}

@Controller('tenants')
export class TenantsController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @NoTenant()
  @Get()
  async list(@Req() request: AccessRequest): Promise<TenantsResponse> {
    if (!request.auth) throw new UnauthorizedException();
    return this.authService.tenants(request.auth);
  }
}
