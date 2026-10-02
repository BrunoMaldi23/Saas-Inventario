import type * as api from '@inventario/api-client';

/*
 * Tipos de contrato de @inventario/types, obtenidos a través de las firmas de
 * @inventario/api-client. apps/web no declara @inventario/types como
 * dependencia directa (agregarla exige actualizar pnpm-lock.yaml, fuera del
 * alcance de apps/web). Son los mismos tipos: cuando se agregue la
 * dependencia, este archivo pasa a ser un simple re-export.
 */
export type AuthSessionResponse = Awaited<ReturnType<typeof api.getMe>>;
export type UserSummary = AuthSessionResponse['user'];
export type ActiveTenant = NonNullable<AuthSessionResponse['activeTenant']>;
export type TenantsResponse = Awaited<ReturnType<typeof api.listTenants>>;
export type TenantOption = TenantsResponse['tenants'][number];
export type LoginRequest = Parameters<typeof api.login>[0];
export type SelectTenantRequest = Parameters<typeof api.selectTenant>[0];
export type MembershipsResponse = Awaited<
  ReturnType<typeof api.listMemberships>
>;
export type MembershipView = MembershipsResponse['memberships'][number];
