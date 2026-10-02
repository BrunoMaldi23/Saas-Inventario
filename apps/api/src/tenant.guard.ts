import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DatabaseService } from './database.service';
import { NO_TENANT_KEY, PUBLIC_KEY } from './access.decorators';
import type { AccessRequest } from './access.context';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (
      this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, targets) ||
      this.reflector.getAllAndOverride<boolean>(NO_TENANT_KEY, targets)
    )
      return true;
    const request = context.switchToHttp().getRequest<AccessRequest>();
    if (!request.auth) throw new UnauthorizedException();
    if (!request.auth.activeTenantId)
      throw new ForbiddenException('Select an active tenant');

    const membership = await this.database.client.tenantMembership.findUnique({
      where: {
        tenantId_userId: {
          tenantId: request.auth.activeTenantId,
          userId: request.auth.userId,
        },
      },
      include: {
        tenant: { select: { status: true } },
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });
    if (
      !membership ||
      membership.status !== 'ACTIVE' ||
      membership.tenant.status !== 'ACTIVE'
    )
      throw new ForbiddenException();
    request.tenant = {
      tenantId: membership.tenantId,
      membershipId: membership.id,
      roleId: membership.roleId,
      roleName: membership.role.name,
      permissions: new Set(
        membership.role.permissions.map((item) => item.permission.key),
      ),
    };
    return true;
  }
}
