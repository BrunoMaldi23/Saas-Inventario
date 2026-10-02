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

// Catálogo (Fase 3).
export type CatalogQuery = NonNullable<Parameters<typeof api.listProducts>[0]>;
export type CatalogPage<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};
export type RecordStatus = Product['status'];
export type Company = Awaited<ReturnType<typeof api.getCompany>>;
export type Branch = Awaited<ReturnType<typeof api.getBranch>>;
export type Category = Awaited<ReturnType<typeof api.getCategory>>;
export type Product = Awaited<ReturnType<typeof api.getProduct>>;
export type Supplier = Awaited<ReturnType<typeof api.getSupplier>>;
export type Warehouse = Awaited<ReturnType<typeof api.getWarehouse>>;
export type CreateCompany = Parameters<typeof api.createCompany>[0];
export type CreateBranch = Parameters<typeof api.createBranch>[0];
export type CreateCategory = Parameters<typeof api.createCategory>[0];
export type CreateProduct = Parameters<typeof api.createProduct>[0];
export type CreateSupplier = Parameters<typeof api.createSupplier>[0];
export type CreateWarehouse = Parameters<typeof api.createWarehouse>[0];
export type RoleOption = Awaited<
  ReturnType<typeof api.listRoles>
>['roles'][number];
