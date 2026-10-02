import { resolve } from 'node:path';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { hashPassword } from './password';
import { ROLE_PERMISSIONS } from './identity-permissions';

const bootstrapSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(1024),
  tenantName: z.string().trim().min(1).max(120),
});

export async function bootstrapIdentity(
  client: PrismaClient,
  input: { email: string; password: string; tenantName: string },
): Promise<{ tenantId: string; userId: string }> {
  const parsed = bootstrapSchema.parse(input);
  const passwordHash = await hashPassword(parsed.password);
  return client.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: { name: parsed.tenantName },
    });
    const user = await tx.user.create({
      data: { email: parsed.email, name: parsed.email, passwordHash },
    });
    const permissionKeys = [...new Set(Object.values(ROLE_PERMISSIONS).flat())];
    const permissions = await Promise.all(
      permissionKeys.map((key) =>
        tx.permission.upsert({ where: { key }, create: { key }, update: {} }),
      ),
    );
    const permissionByKey = new Map(
      permissions.map((permission) => [permission.key, permission.id]),
    );
    const roles = await Promise.all(
      Object.entries(ROLE_PERMISSIONS).map(async ([name, keys]) => {
        const role = await tx.role.create({
          data: { tenantId: tenant.id, name },
        });
        for (const key of keys) {
          const permissionId = permissionByKey.get(key);
          if (!permissionId) throw new Error(`Missing permission: ${key}`);
          await tx.rolePermission.create({
            data: { roleId: role.id, permissionId },
          });
        }
        return role;
      }),
    );
    const owner = roles.find((role) => role.name === 'Owner');
    if (!owner) throw new Error('Owner role missing');
    const membership = await tx.tenantMembership.create({
      data: { tenantId: tenant.id, userId: user.id, roleId: owner.id },
    });
    await tx.auditLog.createMany({
      data: [
        {
          tenantId: tenant.id,
          actorUserId: user.id,
          action: 'USER_CREATED',
          entityId: user.id,
        },
        {
          tenantId: tenant.id,
          actorUserId: user.id,
          action: 'MEMBERSHIP_CREATED',
          entityId: membership.id,
        },
      ],
    });
    return { tenantId: tenant.id, userId: user.id };
  });
}

if (require.main === module) {
  config({ path: resolve(process.cwd(), '../../.env') });
  const client = new PrismaClient();
  void bootstrapIdentity(client, {
    email: process.env.BOOTSTRAP_EMAIL ?? '',
    password: process.env.BOOTSTRAP_PASSWORD ?? '',
    tenantName: process.env.BOOTSTRAP_TENANT_NAME ?? '',
  })
    .then((result) => {
      process.stdout.write(
        `Bootstrap complete: tenant ${result.tenantId}, user ${result.userId}\n`,
      );
    })
    .catch(() => {
      process.stderr.write(
        'Bootstrap failed. Check inputs and whether the email already exists.\n',
      );
      process.exitCode = 1;
    })
    .finally(async () => {
      await client.$disconnect();
    });
}
