import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { NO_TENANT_KEY, PERMISSION_KEY, PUBLIC_KEY } from './access.decorators';
import type { AccessRequest } from './access.context';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (
      this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, targets) ||
      this.reflector.getAllAndOverride<boolean>(NO_TENANT_KEY, targets)
    )
      return true;
    const required = this.reflector.getAllAndOverride<string>(
      PERMISSION_KEY,
      targets,
    );
    const request = context.switchToHttp().getRequest<AccessRequest>();
    if (!required || !request.tenant?.permissions.has(required))
      throw new ForbiddenException();
    return true;
  }
}
