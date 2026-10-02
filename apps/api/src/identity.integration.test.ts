import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from './app.module';
import { bootstrapIdentity } from './bootstrap';
import { hashPassword } from './password';
import { SESSION_COOKIE, sessionCookieOptions } from './session-cookie';

config({ path: resolve(process.cwd(), '../../.env') });

describe('identity, tenancy and access control', () => {
  let app: INestApplication;
  let database: PrismaClient;
  let tenantA: string;
  let tenantB: string;
  let ownerA: string;
  let ownerB: string;
  let multiUser: string;
  let viewerRoleA: string;
  let adminRoleA: string;
  let ownerRoleB: string;
  let membershipOwnerA: string;
  const suffix = randomUUID();
  const password = `test-${suffix}`;
  const emailA = `owner-a-${suffix}@example.test`;
  const emailB = `owner-b-${suffix}@example.test`;
  const multiEmail = `multi-${suffix}@example.test`;

  beforeAll(async () => {
    database = new PrismaClient();
    const a = await bootstrapIdentity(database, {
      email: emailA,
      password,
      tenantName: `Test A ${suffix}`,
    });
    const b = await bootstrapIdentity(database, {
      email: emailB,
      password,
      tenantName: `Test B ${suffix}`,
    });
    tenantA = a.tenantId;
    tenantB = b.tenantId;
    ownerA = a.userId;
    ownerB = b.userId;
    const rolesA = await database.role.findMany({
      where: { tenantId: tenantA },
    });
    const rolesB = await database.role.findMany({
      where: { tenantId: tenantB },
    });
    adminRoleA = rolesA.find((role) => role.name === 'Admin')!.id;
    viewerRoleA = rolesA.find((role) => role.name === 'Viewer')!.id;
    ownerRoleB = rolesB.find((role) => role.name === 'Owner')!.id;
    membershipOwnerA = (
      await database.tenantMembership.findUniqueOrThrow({
        where: { tenantId_userId: { tenantId: tenantA, userId: ownerA } },
      })
    ).id;
    const multi = await database.user.create({
      data: {
        email: multiEmail,
        name: 'Multi User',
        passwordHash: await hashPassword(password),
      },
    });
    multiUser = multi.id;
    await database.tenantMembership.createMany({
      data: [
        { tenantId: tenantA, userId: multiUser, roleId: viewerRoleA },
        { tenantId: tenantB, userId: multiUser, roleId: ownerRoleB },
      ],
    });
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  }, 60000);

  afterAll(async () => {
    await app?.close();
    if (database && tenantA && tenantB) {
      const tenantIds = [tenantA, tenantB];
      const memberships = await database.tenantMembership.findMany({
        where: { tenantId: { in: tenantIds } },
        select: { userId: true },
      });
      const userIds = [
        ...new Set(memberships.map((membership) => membership.userId)),
      ];
      const roles = await database.role.findMany({
        where: { tenantId: { in: tenantIds } },
        select: { id: true },
      });
      await database.session.deleteMany({ where: { userId: { in: userIds } } });
      await database.auditLog.deleteMany({
        where: { actorUserId: { in: userIds } },
      });
      await database.tenantMembership.deleteMany({
        where: { tenantId: { in: tenantIds } },
      });
      await database.rolePermission.deleteMany({
        where: { roleId: { in: roles.map((role) => role.id) } },
      });
      await database.role.deleteMany({
        where: { tenantId: { in: tenantIds } },
      });
      await database.tenant.deleteMany({ where: { id: { in: tenantIds } } });
      await database.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await database?.$disconnect();
  }, 60000);

  async function login(email: string) {
    const agent = request.agent(app.getHttpServer());
    const response = await agent
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    return { agent, response };
  }

  it('logs in with a secure cookie and never exposes passwordHash', async () => {
    const { agent, response } = await login(emailA);
    expect(response.body.user).toEqual({
      id: ownerA,
      email: emailA,
      name: emailA,
    });
    expect(response.body.activeTenant).toBeNull();
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    const cookie = String(response.headers['set-cookie']);
    expect(cookie).toContain(`${SESSION_COOKIE}=`);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    const token = cookie.match(/inventario_session=([^;]+)/)?.[1];
    const storedSession = await database.session.findFirstOrThrow({
      where: { userId: ownerA },
      orderBy: { createdAt: 'desc' },
    });
    expect(storedSession.tokenHash).not.toBe(token);
    await agent.get('/api/v1/auth/me').expect(200);
  });

  it('sets Secure on session cookies in production', () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(sessionCookieOptions().secure).toBe(true);
      expect(sessionCookieOptions().httpOnly).toBe(true);
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  it('rejects invalid credentials and inactive users with the same response', async () => {
    const inactive = await database.user.create({
      data: {
        email: `inactive-${suffix}@example.test`,
        name: 'Inactive',
        passwordHash: await hashPassword(password),
        status: 'INACTIVE',
      },
    });
    await database.tenantMembership.create({
      data: { tenantId: tenantA, userId: inactive.id, roleId: viewerRoleA },
    });
    const wrong = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: emailA, password: 'wrong-password' })
      .expect(401);
    const missing = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `missing-${suffix}@example.test`, password })
      .expect(401);
    const disabled = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: inactive.email, password })
      .expect(401);
    expect(wrong.body.message).toBe('Invalid credentials');
    expect(missing.body.message).toBe(wrong.body.message);
    expect(disabled.body.message).toBe(wrong.body.message);
  });

  it('requires a session and rejects cross-origin writes', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    await request(app.getHttpServer()).get('/api/v1/roles').expect(401);
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('Origin', 'https://attacker.example')
      .send({ email: emailA, password })
      .expect(403);
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('rejects nonexistent tenants and tenants without membership', async () => {
    const { agent } = await login(emailA);
    await agent
      .post('/api/v1/auth/select-tenant')
      .send({ tenantId: randomUUID() })
      .expect(404);
    await agent
      .post('/api/v1/auth/select-tenant')
      .send({ tenantId: tenantB })
      .expect(404);
    await agent.get('/api/v1/roles').expect(403);
  });

  it('lists only memberships of the user and supports explicit tenant switching', async () => {
    const { agent } = await login(multiEmail);
    const tenants = await agent.get('/api/v1/tenants').expect(200);
    expect(
      tenants.body.tenants.map((tenant: { id: string }) => tenant.id).sort(),
    ).toEqual([tenantA, tenantB].sort());
    const inA = await agent
      .post('/api/v1/auth/select-tenant')
      .send({ tenantId: tenantA })
      .expect(200);
    expect(inA.body.activeTenant.role).toBe('Viewer');
    await agent.get('/api/v1/roles').expect(403);
    const inB = await agent
      .post('/api/v1/auth/select-tenant')
      .send({ tenantId: tenantB })
      .expect(200);
    expect(inB.body.activeTenant.role).toBe('Owner');
    const listB = await agent.get('/api/v1/memberships').expect(200);
    expect(
      listB.body.memberships.some(
        (membership: { user: { id: string } }) => membership.user.id === ownerB,
      ),
    ).toBe(true);
    expect(
      listB.body.memberships.some(
        (membership: { user: { id: string } }) => membership.user.id === ownerA,
      ),
    ).toBe(false);
    await agent
      .post('/api/v1/auth/select-tenant')
      .send({ tenantId: tenantA })
      .expect(200);
    await agent.get('/api/v1/memberships').expect(403);
  });

  it('allows Owner actions, denies Viewer, scopes targets, and audits changes', async () => {
    const { agent } = await login(emailA);
    await agent
      .post('/api/v1/auth/select-tenant')
      .send({ tenantId: tenantA })
      .expect(200);
    const roles = await agent.get('/api/v1/roles').expect(200);
    expect(
      roles.body.roles.some((role: { name: string }) => role.name === 'Owner'),
    ).toBe(true);
    const created = await agent
      .post('/api/v1/users')
      .send({
        email: `created-${suffix}@example.test`,
        name: 'Created User',
        password,
        roleId: viewerRoleA,
      })
      .expect(201);
    expect(created.body).toEqual({
      id: expect.any(String),
      email: `created-${suffix}@example.test`,
      name: 'Created User',
    });
    expect(JSON.stringify(created.body)).not.toContain('passwordHash');
    const storedUser = await database.user.findUniqueOrThrow({
      where: { id: created.body.id },
    });
    expect(storedUser.passwordHash).toMatch(/^\$argon2id\$/);
    expect(storedUser.passwordHash).not.toBe(password);
    await agent
      .post('/api/v1/users')
      .send({
        email: `short-${suffix}@example.test`,
        name: 'Short',
        password: 'short',
        roleId: viewerRoleA,
      })
      .expect(400);
    const membership = await database.tenantMembership.findUniqueOrThrow({
      where: {
        tenantId_userId: { tenantId: tenantA, userId: created.body.id },
      },
    });
    await agent
      .patch(`/api/v1/memberships/${membership.id}/role`)
      .send({ roleId: ownerRoleB })
      .expect(404);
    const changed = await agent
      .patch(`/api/v1/memberships/${membership.id}/role`)
      .send({ roleId: adminRoleA })
      .expect(200);
    expect(changed.body.role.name).toBe('Admin');
    await agent
      .patch(`/api/v1/memberships/${membership.id}/status`)
      .send({ status: 'INACTIVE' })
      .expect(200);
    const actions = await database.auditLog.findMany({
      where: {
        tenantId: tenantA,
        entityId: { in: [created.body.id, membership.id] },
      },
      select: { action: true },
    });
    expect(actions.map((event) => event.action)).toEqual(
      expect.arrayContaining([
        'USER_CREATED',
        'MEMBERSHIP_CREATED',
        'ROLE_CHANGED',
        'MEMBERSHIP_STATUS_CHANGED',
      ]),
    );
    const viewer = await login(multiEmail);
    await viewer.agent
      .post('/api/v1/auth/select-tenant')
      .send({ tenantId: tenantA })
      .expect(200);
    await viewer.agent
      .post('/api/v1/users')
      .send({
        email: `denied-${suffix}@example.test`,
        name: 'Denied',
        password,
        roleId: viewerRoleA,
      })
      .expect(403);
    await viewer.agent
      .post('/api/v1/memberships/by-email')
      .send({ email: emailB, roleId: viewerRoleA })
      .expect(403);
    const bMembership = await database.tenantMembership.findUniqueOrThrow({
      where: { tenantId_userId: { tenantId: tenantB, userId: ownerB } },
    });
    await agent
      .patch(`/api/v1/memberships/${bMembership.id}/role`)
      .send({ roleId: viewerRoleA })
      .expect(404);
    await agent
      .patch(`/api/v1/memberships/${membershipOwnerA}/role`)
      .send({ roleId: viewerRoleA })
      .expect(409);
  });

  it('adds an existing user to another tenant and checks that tenant role immediately', async () => {
    const { agent } = await login(emailA);
    await agent
      .post('/api/v1/auth/select-tenant')
      .send({ tenantId: tenantA })
      .expect(200);
    const added = await agent
      .post('/api/v1/memberships/by-email')
      .send({ email: emailB.toUpperCase(), roleId: viewerRoleA })
      .expect(201);
    expect(added.body.user.id).toBe(ownerB);
    await agent
      .post('/api/v1/memberships/by-email')
      .send({ email: emailB, roleId: viewerRoleA })
      .expect(409);
    await agent
      .post('/api/v1/memberships/by-email')
      .send({ email: `unknown-${suffix}@example.test`, roleId: viewerRoleA })
      .expect(404, {
        statusCode: 404,
        message: 'User not found',
        error: 'Not Found',
      });
    expect(
      await database.auditLog.count({
        where: {
          tenantId: tenantA,
          actorUserId: ownerA,
          action: 'MEMBERSHIP_CREATED',
          entityId: added.body.id,
        },
      }),
    ).toBe(1);
    const bOwner = await login(emailB);
    const tenantList = await bOwner.agent.get('/api/v1/tenants').expect(200);
    expect(
      tenantList.body.tenants.map((tenant: { id: string }) => tenant.id),
    ).toEqual(expect.arrayContaining([tenantA, tenantB]));
    await bOwner.agent
      .post('/api/v1/auth/select-tenant')
      .send({ tenantId: tenantA })
      .expect(200);
    await bOwner.agent.get('/api/v1/roles').expect(403);
  });

  it('lets Admin manage operational users without escalating to Owner or Admin', async () => {
    const owner = await login(emailA);
    await owner.agent
      .post('/api/v1/auth/select-tenant')
      .send({ tenantId: tenantA })
      .expect(200);
    const createdAdmin = await owner.agent
      .post('/api/v1/users')
      .send({
        email: `admin-${suffix}@example.test`,
        name: 'Admin User',
        password,
        roleId: adminRoleA,
      })
      .expect(201);
    const admin = await login(createdAdmin.body.email);
    await admin.agent
      .post('/api/v1/auth/select-tenant')
      .send({ tenantId: tenantA })
      .expect(200);
    await admin.agent.get('/api/v1/memberships').expect(200);
    const createdViewer = await admin.agent
      .post('/api/v1/users')
      .send({
        email: `admin-created-${suffix}@example.test`,
        name: 'Viewer User',
        password,
        roleId: viewerRoleA,
      })
      .expect(201);
    const viewerMembership = await database.tenantMembership.findUniqueOrThrow({
      where: {
        tenantId_userId: { tenantId: tenantA, userId: createdViewer.body.id },
      },
    });
    await admin.agent
      .post('/api/v1/users')
      .send({
        email: `escalated-${suffix}@example.test`,
        name: 'Escalated',
        password,
        roleId: (
          await database.role.findUniqueOrThrow({
            where: { tenantId_name: { tenantId: tenantA, name: 'Owner' } },
          })
        ).id,
      })
      .expect(403);
    await admin.agent
      .patch(`/api/v1/memberships/${membershipOwnerA}/status`)
      .send({ status: 'INACTIVE' })
      .expect(403);
    await admin.agent
      .patch(`/api/v1/memberships/${viewerMembership.id}/role`)
      .send({ roleId: adminRoleA })
      .expect(403);
    await admin.agent
      .patch(`/api/v1/memberships/${viewerMembership.id}/status`)
      .send({ status: 'INACTIVE' })
      .expect(200);
  });

  it('invalidates expired sessions and records logout', async () => {
    const { agent } = await login(emailA);
    const session = await database.session.findFirstOrThrow({
      where: { userId: ownerA },
      orderBy: { createdAt: 'desc' },
    });
    await database.session.update({
      where: { id: session.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await agent.get('/api/v1/auth/me').expect(401);
    const fresh = await login(emailA);
    await fresh.agent.post('/api/v1/auth/logout').expect(204);
    await fresh.agent.get('/api/v1/auth/me').expect(401);
    const actions = await database.auditLog.findMany({
      where: { actorUserId: ownerA },
      select: { action: true },
    });
    expect(actions.map((event) => event.action)).toEqual(
      expect.arrayContaining(['LOGIN', 'LOGOUT']),
    );
  });

  it('revokes permissions when a role or membership changes', async () => {
    const multi = await login(multiEmail);
    await multi.agent
      .post('/api/v1/auth/select-tenant')
      .send({ tenantId: tenantB })
      .expect(200);
    await multi.agent.get('/api/v1/roles').expect(200);
    const bOwner = await login(emailB);
    await bOwner.agent
      .post('/api/v1/auth/select-tenant')
      .send({ tenantId: tenantB })
      .expect(200);
    const membership = await database.tenantMembership.findUniqueOrThrow({
      where: { tenantId_userId: { tenantId: tenantB, userId: multiUser } },
    });
    const viewerRoleB = (
      await database.role.findUniqueOrThrow({
        where: { tenantId_name: { tenantId: tenantB, name: 'Viewer' } },
      })
    ).id;
    await bOwner.agent
      .patch(`/api/v1/memberships/${membership.id}/role`)
      .send({ roleId: viewerRoleB })
      .expect(200);
    await multi.agent.get('/api/v1/roles').expect(403);
    await bOwner.agent
      .patch(`/api/v1/memberships/${membership.id}/status`)
      .send({ status: 'INACTIVE' })
      .expect(200);
    await multi.agent
      .get('/api/v1/auth/me')
      .expect(200)
      .then((response) => expect(response.body.activeTenant).toBeNull());
    await multi.agent
      .post('/api/v1/auth/select-tenant')
      .send({ tenantId: tenantB })
      .expect(404);
  });

  it('rejects a tenant that becomes inactive after selection', async () => {
    const owner = await login(emailA);
    await owner.agent
      .post('/api/v1/auth/select-tenant')
      .send({ tenantId: tenantA })
      .expect(200);
    await database.tenant.update({
      where: { id: tenantA },
      data: { status: 'INACTIVE' },
    });
    try {
      await owner.agent.get('/api/v1/roles').expect(403);
      const list = await owner.agent.get('/api/v1/tenants').expect(200);
      expect(
        list.body.tenants.some(
          (tenant: { id: string }) => tenant.id === tenantA,
        ),
      ).toBe(false);
      await owner.agent
        .post('/api/v1/auth/select-tenant')
        .send({ tenantId: tenantA })
        .expect(404);
    } finally {
      await database.tenant.update({
        where: { id: tenantA },
        data: { status: 'ACTIVE' },
      });
    }
  });

  it('changes password, audits it, and revokes other sessions', async () => {
    const oldPassword = `old-${suffix}`;
    const newPassword = `new-${suffix}`;
    const email = `password-${suffix}@example.test`;
    const user = await database.user.create({
      data: {
        email,
        name: 'Password User',
        passwordHash: await hashPassword(oldPassword),
      },
    });
    await database.tenantMembership.create({
      data: { tenantId: tenantA, userId: user.id, roleId: viewerRoleA },
    });
    const current = request.agent(app.getHttpServer());
    const other = request.agent(app.getHttpServer());
    await current
      .post('/api/v1/auth/login')
      .send({ email, password: oldPassword })
      .expect(200);
    await other
      .post('/api/v1/auth/login')
      .send({ email, password: oldPassword })
      .expect(200);
    await current
      .post('/api/v1/auth/change-password')
      .send({ currentPassword: 'wrong-password', newPassword })
      .expect(401);
    await current
      .post('/api/v1/auth/change-password')
      .send({ currentPassword: oldPassword, newPassword: 'short' })
      .expect(400);
    const before = await database.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    await current
      .post('/api/v1/auth/change-password')
      .send({ currentPassword: oldPassword, newPassword })
      .expect(204);
    const after = await database.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    expect(after.passwordHash).toMatch(/^\$argon2id\$/);
    expect(after.passwordHash).not.toBe(before.passwordHash);
    expect(after.passwordHash).not.toBe(newPassword);
    await current.get('/api/v1/auth/me').expect(200);
    await other.get('/api/v1/auth/me').expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: oldPassword })
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: newPassword })
      .expect(200);
    expect(
      await database.auditLog.count({
        where: { actorUserId: user.id, action: 'PASSWORD_CHANGED' },
      }),
    ).toBe(1);
  });
});
