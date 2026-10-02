import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type AccountStatus } from '@prisma/client';
import type {
  MembershipView,
  MembershipsResponse,
  RoleOption,
  RolesResponse,
  UserSummary,
} from '@inventario/types';
import type { AuthContext, TenantContext } from './access.context';
import { DatabaseService } from './database.service';
import { hashPassword } from './password';

@Injectable()
export class AdminService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async roles(tenant: TenantContext): Promise<RolesResponse> {
    const roles = await this.database.client.role.findMany({
      where: { tenantId: tenant.tenantId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    return { roles };
  }

  async memberships(tenant: TenantContext): Promise<MembershipsResponse> {
    const memberships = await this.database.client.tenantMembership.findMany({
      where: { tenantId: tenant.tenantId },
      select: {
        id: true,
        status: true,
        user: { select: { id: true, email: true, name: true } },
        role: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return { memberships };
  }

  async createUser(
    auth: AuthContext,
    tenant: TenantContext,
    input: { email: string; name: string; password: string; roleId: string },
  ): Promise<UserSummary> {
    const role = await this.requireRole(tenant.tenantId, input.roleId);
    this.assertAssignableRole(tenant, role.name);
    const passwordHash = await hashPassword(input.password);
    try {
      return await this.database.client.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { email: input.email, name: input.name, passwordHash },
          select: { id: true, email: true, name: true },
        });
        const membership = await tx.tenantMembership.create({
          data: {
            tenantId: tenant.tenantId,
            userId: user.id,
            roleId: input.roleId,
          },
        });
        await tx.auditLog.createMany({
          data: [
            {
              tenantId: tenant.tenantId,
              actorUserId: auth.userId,
              action: 'USER_CREATED',
              entityId: user.id,
            },
            {
              tenantId: tenant.tenantId,
              actorUserId: auth.userId,
              action: 'MEMBERSHIP_CREATED',
              entityId: membership.id,
            },
          ],
        });
        return user;
      });
    } catch (error) {
      this.rethrowConflict(error);
      throw error;
    }
  }

  async createMembership(
    auth: AuthContext,
    tenant: TenantContext,
    input: { userId: string; roleId: string },
  ): Promise<MembershipView> {
    const role = await this.requireRole(tenant.tenantId, input.roleId);
    this.assertAssignableRole(tenant, role.name);
    const user = await this.database.client.user.findUnique({
      where: { id: input.userId },
      select: { id: true, status: true },
    });
    if (!user || user.status !== 'ACTIVE')
      throw new NotFoundException('User not found');
    try {
      return await this.database.client.$transaction(async (tx) => {
        const membership = await tx.tenantMembership.create({
          data: {
            tenantId: tenant.tenantId,
            userId: input.userId,
            roleId: input.roleId,
          },
          select: {
            id: true,
            status: true,
            user: { select: { id: true, email: true, name: true } },
            role: { select: { id: true, name: true } },
          },
        });
        await tx.auditLog.create({
          data: {
            tenantId: tenant.tenantId,
            actorUserId: auth.userId,
            action: 'MEMBERSHIP_CREATED',
            entityId: membership.id,
          },
        });
        return membership;
      });
    } catch (error) {
      this.rethrowConflict(error);
      throw error;
    }
  }

  async changeRole(
    auth: AuthContext,
    tenant: TenantContext,
    membershipId: string,
    roleId: string,
  ): Promise<MembershipView> {
    const newRole = await this.requireRole(tenant.tenantId, roleId);
    this.assertAssignableRole(tenant, newRole.name);
    try {
      return await this.database.client.$transaction(
        async (tx) => {
          const existing = await tx.tenantMembership.findFirst({
            where: { id: membershipId, tenantId: tenant.tenantId },
            include: { role: true },
          });
          if (!existing) throw new NotFoundException('Membership not found');
          this.assertManageableRole(tenant, existing.role.name);
          if (
            existing.role.name === 'Owner' &&
            newRole.name !== 'Owner' &&
            existing.status === 'ACTIVE'
          ) {
            await this.ensureAnotherOwner(tx, tenant.tenantId);
          }
          const updated = await tx.tenantMembership.update({
            where: { id: existing.id },
            data: { roleId },
            select: {
              id: true,
              status: true,
              user: { select: { id: true, email: true, name: true } },
              role: { select: { id: true, name: true } },
            },
          });
          await tx.auditLog.create({
            data: {
              tenantId: tenant.tenantId,
              actorUserId: auth.userId,
              action: 'ROLE_CHANGED',
              entityId: existing.id,
              details: { oldRoleId: existing.roleId, newRoleId: roleId },
            },
          });
          return updated;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      this.rethrowConflict(error);
      throw error;
    }
  }

  async changeStatus(
    auth: AuthContext,
    tenant: TenantContext,
    membershipId: string,
    status: AccountStatus,
  ): Promise<MembershipView> {
    try {
      return await this.database.client.$transaction(
        async (tx) => {
          const existing = await tx.tenantMembership.findFirst({
            where: { id: membershipId, tenantId: tenant.tenantId },
            include: { role: true },
          });
          if (!existing) throw new NotFoundException('Membership not found');
          this.assertManageableRole(tenant, existing.role.name);
          if (
            existing.role.name === 'Owner' &&
            existing.status === 'ACTIVE' &&
            status === 'INACTIVE'
          ) {
            await this.ensureAnotherOwner(tx, tenant.tenantId);
          }
          const updated = await tx.tenantMembership.update({
            where: { id: existing.id },
            data: { status },
            select: {
              id: true,
              status: true,
              user: { select: { id: true, email: true, name: true } },
              role: { select: { id: true, name: true } },
            },
          });
          await tx.auditLog.create({
            data: {
              tenantId: tenant.tenantId,
              actorUserId: auth.userId,
              action: 'MEMBERSHIP_STATUS_CHANGED',
              entityId: existing.id,
              details: { oldStatus: existing.status, newStatus: status },
            },
          });
          return updated;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      this.rethrowConflict(error);
      throw error;
    }
  }

  private async requireRole(
    tenantId: string,
    roleId: string,
  ): Promise<RoleOption> {
    const role = await this.database.client.role.findFirst({
      where: { id: roleId, tenantId },
      select: { id: true, name: true },
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  private assertAssignableRole(tenant: TenantContext, roleName: string): void {
    if (tenant.roleName !== 'Owner' && ['Owner', 'Admin'].includes(roleName)) {
      throw new ForbiddenException('Cannot assign a privileged role');
    }
  }

  private assertManageableRole(tenant: TenantContext, roleName: string): void {
    if (tenant.roleName !== 'Owner' && ['Owner', 'Admin'].includes(roleName)) {
      throw new ForbiddenException('Cannot modify a privileged membership');
    }
  }

  private async ensureAnotherOwner(
    tx: Prisma.TransactionClient,
    tenantId: string,
  ): Promise<void> {
    const owners = await tx.tenantMembership.count({
      where: { tenantId, status: 'ACTIVE', role: { name: 'Owner' } },
    });
    if (owners <= 1)
      throw new ConflictException('The last active Owner cannot be removed');
  }

  private rethrowConflict(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      ['P2002', 'P2034'].includes(error.code)
    ) {
      throw new ConflictException('Conflicting identity change');
    }
  }
}
