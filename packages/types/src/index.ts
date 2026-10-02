export type HealthResponse = { status: 'ok' };
export type DatabaseHealthResponse = { status: 'ok' | 'error' };

export type AccountStatus = 'ACTIVE' | 'INACTIVE';
export type UserSummary = { id: string; email: string; name: string };
export type ActiveTenant = {
  id: string;
  name: string;
  role: string;
  permissions: string[];
};
export type AuthSessionResponse = {
  user: UserSummary;
  activeTenant: ActiveTenant | null;
  expiresAt: string;
};
export type TenantOption = { id: string; name: string; role: string };
export type TenantsResponse = { tenants: TenantOption[] };
export type RoleOption = { id: string; name: string };
export type RolesResponse = { roles: RoleOption[] };
export type MembershipView = {
  id: string;
  user: UserSummary;
  role: RoleOption;
  status: AccountStatus;
};
export type MembershipsResponse = { memberships: MembershipView[] };

export type LoginRequest = { email: string; password: string };
export type SelectTenantRequest = { tenantId: string };
export type CreateUserRequest = {
  email: string;
  name: string;
  password: string;
  roleId: string;
};
export type CreateMembershipRequest = { userId: string; roleId: string };
export type ChangeRoleRequest = { roleId: string };
export type ChangeMembershipStatusRequest = { status: AccountStatus };
