import { z } from 'zod';
export * from './catalog.js';
export * from './inventory.js';

export const healthResponseSchema = z.object({ status: z.literal('ok') });
export const databaseHealthResponseSchema = z.object({
  status: z.enum(['ok', 'error']),
});

const uuid = z.string().uuid();
export const loginRequestSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((email) => email.toLowerCase()),
    password: z.string().min(1).max(1024),
  })
  .strict();
export const changePasswordRequestSchema = z
  .object({
    currentPassword: z.string().min(1).max(1024),
    newPassword: z.string().min(8).max(1024),
  })
  .strict();
export const selectTenantRequestSchema = z.object({ tenantId: uuid }).strict();
export const createUserRequestSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((email) => email.toLowerCase()),
    name: z.string().trim().min(1).max(120),
    password: z.string().min(8).max(1024),
    roleId: uuid,
  })
  .strict();
export const createMembershipRequestSchema = z
  .object({ userId: uuid, roleId: uuid })
  .strict();
export const addMembershipByEmailRequestSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((value) => value.toLowerCase()),
    roleId: uuid,
  })
  .strict();
export const changeRoleRequestSchema = z.object({ roleId: uuid }).strict();
export const changeMembershipStatusRequestSchema = z
  .object({ status: z.enum(['ACTIVE', 'INACTIVE']) })
  .strict();

export const userSummarySchema = z.object({
  id: uuid,
  email: z.string(),
  name: z.string(),
});
export const activeTenantSchema = z.object({
  id: uuid,
  name: z.string(),
  role: z.string(),
  permissions: z.array(z.string()),
});
export const authSessionResponseSchema = z.object({
  user: userSummarySchema,
  activeTenant: activeTenantSchema.nullable(),
  expiresAt: z.string().datetime(),
});
export const tenantsResponseSchema = z.object({
  tenants: z.array(z.object({ id: uuid, name: z.string(), role: z.string() })),
});
export const rolesResponseSchema = z.object({
  roles: z.array(z.object({ id: uuid, name: z.string() })),
});
export const membershipViewSchema = z.object({
  id: uuid,
  user: userSummarySchema,
  role: z.object({ id: uuid, name: z.string() }),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});
export const membershipsResponseSchema = z.object({
  memberships: z.array(membershipViewSchema),
});
export const apiErrorSchema = z
  .object({
    statusCode: z.number().int().optional(),
    code: z.string().optional(),
    message: z.union([z.string(), z.array(z.string())]).optional(),
    details: z.unknown().optional(),
  })
  .passthrough();
