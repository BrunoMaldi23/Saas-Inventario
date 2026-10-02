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

export type CatalogQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: AccountStatus;
};
export type CatalogPage<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};
export type CatalogRecord = {
  id: string;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
};

export type Company = CatalogRecord & {
  name: string;
  taxId: string | null;
  businessType: string | null;
};
export type Branch = CatalogRecord & {
  companyId: string;
  name: string;
  address: string | null;
};
export type Category = CatalogRecord & {
  name: string;
  parentId: string | null;
};
export type Product = CatalogRecord & {
  categoryId: string | null;
  sku: string | null;
  barcode: string | null;
  name: string;
  description: string | null;
  unitOfMeasure: string;
  minStock: string | null;
};
export type Supplier = CatalogRecord & {
  name: string;
  taxId: string | null;
  email: string | null;
  phone: string | null;
};
export type Warehouse = CatalogRecord & {
  branchId: string;
  name: string;
  type: string;
};

export type CreateCompany = {
  name: string;
  taxId?: string | null;
  businessType?: string | null;
  status?: AccountStatus;
};
export type CreateBranch = {
  companyId: string;
  name: string;
  address?: string | null;
  status?: AccountStatus;
};
export type CreateCategory = {
  name: string;
  parentId?: string | null;
  status?: AccountStatus;
};
export type CreateProduct = {
  categoryId?: string | null;
  sku?: string | null;
  barcode?: string | null;
  name: string;
  description?: string | null;
  unitOfMeasure: string;
  status?: AccountStatus;
  minStock?: string | null;
};
export type CreateSupplier = {
  name: string;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: AccountStatus;
};
export type CreateWarehouse = {
  branchId: string;
  name: string;
  type: string;
  status?: AccountStatus;
};
