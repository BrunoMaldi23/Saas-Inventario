import {
  Injectable,
  Inject,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import type {
  AuthSessionResponse,
  ChangePasswordRequest,
  TenantOption,
  TenantsResponse,
} from '@inventario/types';
import { DatabaseService } from './database.service';
import { SESSION_DURATION_MS } from './session-cookie';
import { hashPassword, verifyPassword } from './password';
import type { AuthContext } from './access.context';

@Injectable()
export class AuthService {
  private readonly dummyHash = hashPassword('invalid-login-placeholder');

  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async login(
    email: string,
    password: string,
  ): Promise<{ token: string; body: AuthSessionResponse }> {
    const user = await this.database.client.user.findUnique({
      where: { email },
    });
    const valid = await verifyPassword(
      user?.passwordHash ?? (await this.dummyHash),
      password,
    );
    if (!user || user.status !== 'ACTIVE' || !valid)
      throw new UnauthorizedException('Invalid credentials');

    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    await this.database.client.$transaction(async (tx) => {
      const session = await tx.session.create({
        data: { userId: user.id, tokenHash, expiresAt },
      });
      await tx.auditLog.create({
        data: { actorUserId: user.id, action: 'LOGIN', entityId: session.id },
      });
    });
    return {
      token,
      body: {
        user: { id: user.id, email: user.email, name: user.name },
        activeTenant: null,
        expiresAt: expiresAt.toISOString(),
      },
    };
  }

  async logout(auth: AuthContext): Promise<void> {
    await this.database.client.$transaction(async (tx) => {
      await tx.session.delete({ where: { id: auth.sessionId } });
      await tx.auditLog.create({
        data: {
          tenantId: auth.activeTenantId,
          actorUserId: auth.userId,
          action: 'LOGOUT',
          entityId: auth.sessionId,
        },
      });
    });
  }

  async changePassword(
    auth: AuthContext,
    input: ChangePasswordRequest,
  ): Promise<void> {
    const user = await this.database.client.user.findUnique({
      where: { id: auth.userId },
    });
    if (
      !user ||
      !(await verifyPassword(user.passwordHash, input.currentPassword))
    )
      throw new UnauthorizedException('Invalid credentials');
    const passwordHash = await hashPassword(input.newPassword);
    await this.database.client.$transaction(async (tx) => {
      const changed = await tx.user.updateMany({
        where: {
          id: auth.userId,
          passwordHash: user.passwordHash,
          status: 'ACTIVE',
        },
        data: { passwordHash },
      });
      if (changed.count !== 1)
        throw new UnauthorizedException('Invalid credentials');
      await tx.session.deleteMany({
        where: { userId: auth.userId, id: { not: auth.sessionId } },
      });
      await tx.auditLog.create({
        data: {
          tenantId: auth.activeTenantId,
          actorUserId: auth.userId,
          action: 'PASSWORD_CHANGED',
          entityId: auth.userId,
        },
      });
    });
  }

  async me(auth: AuthContext): Promise<AuthSessionResponse> {
    if (!auth.activeTenantId) return this.sessionView(auth, null);
    const membership = await this.findActiveMembership(
      auth.userId,
      auth.activeTenantId,
    );
    if (!membership) {
      await this.database.client.session.update({
        where: { id: auth.sessionId },
        data: { activeTenantId: null },
      });
      return this.sessionView(auth, null);
    }
    return this.sessionView(auth, membership);
  }

  async selectTenant(
    auth: AuthContext,
    tenantId: string,
  ): Promise<AuthSessionResponse> {
    const membership = await this.findActiveMembership(auth.userId, tenantId);
    if (!membership) throw new NotFoundException('Tenant membership not found');
    await this.database.client.$transaction(async (tx) => {
      await tx.session.update({
        where: { id: auth.sessionId },
        data: { activeTenantId: tenantId },
      });
      await tx.auditLog.create({
        data: {
          tenantId,
          actorUserId: auth.userId,
          action: 'TENANT_SELECTED',
          entityId: membership.id,
        },
      });
    });
    return this.sessionView(auth, membership);
  }

  async tenants(auth: AuthContext): Promise<TenantsResponse> {
    const memberships = await this.database.client.tenantMembership.findMany({
      where: {
        userId: auth.userId,
        status: 'ACTIVE',
        tenant: { status: 'ACTIVE' },
      },
      include: {
        tenant: { select: { id: true, name: true } },
        role: { select: { name: true } },
      },
      orderBy: { tenant: { name: 'asc' } },
    });
    const tenants: TenantOption[] = memberships.map((item) => ({
      id: item.tenant.id,
      name: item.tenant.name,
      role: item.role.name,
    }));
    return { tenants };
  }

  private async findActiveMembership(userId: string, tenantId: string) {
    const membership = await this.database.client.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
      include: {
        tenant: { select: { id: true, name: true, status: true } },
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });
    if (
      !membership ||
      membership.status !== 'ACTIVE' ||
      membership.tenant.status !== 'ACTIVE'
    )
      return null;
    return membership;
  }

  private sessionView(
    auth: AuthContext,
    membership: NonNullable<
      Awaited<ReturnType<AuthService['findActiveMembership']>>
    > | null,
  ): AuthSessionResponse {
    return {
      user: auth.user,
      activeTenant: membership
        ? {
            id: membership.tenant.id,
            name: membership.tenant.name,
            role: membership.role.name,
            permissions: membership.role.permissions
              .map((item) => item.permission.key)
              .sort(),
          }
        : null,
      expiresAt: auth.expiresAt.toISOString(),
    };
  }
}
