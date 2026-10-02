import type { Request } from 'express';
import type { UserSummary } from '@inventario/types';

export interface AuthContext {
  sessionId: string;
  userId: string;
  user: UserSummary;
  activeTenantId: string | null;
  expiresAt: Date;
}

export interface TenantContext {
  tenantId: string;
  membershipId: string;
  roleId: string;
  roleName: string;
  permissions: Set<string>;
}

export interface AccessRequest extends Request {
  auth?: AuthContext;
  tenant?: TenantContext;
}
