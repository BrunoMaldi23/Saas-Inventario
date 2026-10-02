import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Reflector } from '@nestjs/core';
import { DatabaseService } from './database.service';
import { PUBLIC_KEY } from './access.decorators';
import { SESSION_COOKIE } from './session-cookie';
import type { AccessRequest } from './access.context';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const request = context.switchToHttp().getRequest<AccessRequest>();
    const token: unknown = request.cookies?.[SESSION_COOKIE];
    if (typeof token !== 'string' || !token || token.length > 128)
      throw new UnauthorizedException();

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const session = await this.database.client.session.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        activeTenantId: true,
        expiresAt: true,
        user: { select: { id: true, email: true, name: true, status: true } },
      },
    });
    if (
      !session ||
      session.expiresAt <= new Date() ||
      session.user.status !== 'ACTIVE'
    )
      throw new UnauthorizedException();
    request.auth = {
      sessionId: session.id,
      userId: session.userId,
      activeTenantId: session.activeTenantId,
      expiresAt: session.expiresAt,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      },
    };
    return true;
  }
}
