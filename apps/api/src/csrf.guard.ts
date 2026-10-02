import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AccessRequest } from './access.context';

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AccessRequest>();
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;

    if (request.header('sec-fetch-site') === 'cross-site')
      throw new ForbiddenException();
    const source = request.header('origin') ?? request.header('referer');
    if (!source) return true;

    try {
      const url = new URL(source);
      const host = request.header('host');
      if (
        url.host !== host ||
        (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')
      ) {
        throw new ForbiddenException();
      }
    } catch {
      throw new ForbiddenException();
    }
    return true;
  }
}
