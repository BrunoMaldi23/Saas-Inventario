import type {
  AuthSessionResponse,
  ChangeMembershipStatusRequest,
  ChangeRoleRequest,
  CreateMembershipRequest,
  CreateUserRequest,
  DatabaseHealthResponse,
  HealthResponse,
  LoginRequest,
  MembershipView,
  MembershipsResponse,
  RolesResponse,
  SelectTenantRequest,
  TenantsResponse,
  UserSummary,
} from '@inventario/types';
import {
  authSessionResponseSchema,
  databaseHealthResponseSchema,
  healthResponseSchema,
  membershipViewSchema,
  membershipsResponseSchema,
  rolesResponseSchema,
  tenantsResponseSchema,
  userSummarySchema,
} from '@inventario/validation';

async function requestJson(
  path: string,
  method = 'GET',
  body?: unknown,
): Promise<unknown> {
  const response = await fetch(path, {
    method,
    credentials: 'same-origin',
    cache: 'no-store',
    headers:
      body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  if (response.status === 204) return undefined;
  return response.json();
}

export async function getApiHealth(): Promise<HealthResponse> {
  return healthResponseSchema.parse(await requestJson('/api/v1/health'));
}

export async function getDatabaseHealth(): Promise<DatabaseHealthResponse> {
  return databaseHealthResponseSchema.parse(
    await requestJson('/api/v1/health/database'),
  );
}

export async function login(input: LoginRequest): Promise<AuthSessionResponse> {
  return authSessionResponseSchema.parse(
    await requestJson('/api/v1/auth/login', 'POST', input),
  );
}

export async function logout(): Promise<void> {
  await requestJson('/api/v1/auth/logout', 'POST');
}

export async function getMe(): Promise<AuthSessionResponse> {
  return authSessionResponseSchema.parse(await requestJson('/api/v1/auth/me'));
}

export async function listTenants(): Promise<TenantsResponse> {
  return tenantsResponseSchema.parse(await requestJson('/api/v1/tenants'));
}

export async function selectTenant(
  input: SelectTenantRequest,
): Promise<AuthSessionResponse> {
  return authSessionResponseSchema.parse(
    await requestJson('/api/v1/auth/select-tenant', 'POST', input),
  );
}

export async function listRoles(): Promise<RolesResponse> {
  return rolesResponseSchema.parse(await requestJson('/api/v1/roles'));
}

export async function listMemberships(): Promise<MembershipsResponse> {
  return membershipsResponseSchema.parse(
    await requestJson('/api/v1/memberships'),
  );
}

export async function createUser(
  input: CreateUserRequest,
): Promise<UserSummary> {
  return userSummarySchema.parse(
    await requestJson('/api/v1/users', 'POST', input),
  );
}

export async function createMembership(
  input: CreateMembershipRequest,
): Promise<MembershipView> {
  return membershipViewSchema.parse(
    await requestJson('/api/v1/memberships', 'POST', input),
  );
}

export async function changeMembershipRole(
  id: string,
  input: ChangeRoleRequest,
): Promise<MembershipView> {
  return membershipViewSchema.parse(
    await requestJson(
      `/api/v1/memberships/${encodeURIComponent(id)}/role`,
      'PATCH',
      input,
    ),
  );
}

export async function changeMembershipStatus(
  id: string,
  input: ChangeMembershipStatusRequest,
): Promise<MembershipView> {
  return membershipViewSchema.parse(
    await requestJson(
      `/api/v1/memberships/${encodeURIComponent(id)}/status`,
      'PATCH',
      input,
    ),
  );
}
