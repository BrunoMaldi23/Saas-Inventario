import type {
  CatalogQuery,
  CatalogPage,
  Company,
  CreateCompany,
  Branch,
  CreateBranch,
  Category,
  CreateCategory,
  Product,
  CreateProduct,
  Supplier,
  CreateSupplier,
  Warehouse,
  CreateWarehouse,
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
  catalogPageSchema,
  companySchema,
  branchSchema,
  categorySchema,
  productSchema,
  supplierSchema,
  warehouseSchema,
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

function catalogPath(path: string, query: CatalogQuery = {}): string {
  const params = new URLSearchParams();
  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.pageSize !== undefined)
    params.set('pageSize', String(query.pageSize));
  if (query.search !== undefined) params.set('search', query.search);
  if (query.status !== undefined) params.set('status', query.status);
  const suffix = params.toString();
  return suffix ? `${path}?${suffix}` : path;
}

export async function listCompanies(
  query: CatalogQuery = {},
): Promise<CatalogPage<Company>> {
  return catalogPageSchema(companySchema).parse(
    await requestJson(catalogPath('/api/v1/companies', query)),
  );
}
export async function getCompany(id: string): Promise<Company> {
  return companySchema.parse(
    await requestJson(`/api/v1/companies/${encodeURIComponent(id)}`),
  );
}
export async function createCompany(input: CreateCompany): Promise<Company> {
  return companySchema.parse(
    await requestJson('/api/v1/companies', 'POST', input),
  );
}
export async function updateCompany(
  id: string,
  input: Partial<CreateCompany>,
): Promise<Company> {
  return companySchema.parse(
    await requestJson(
      `/api/v1/companies/${encodeURIComponent(id)}`,
      'PATCH',
      input,
    ),
  );
}

export async function listBranches(
  query: CatalogQuery = {},
): Promise<CatalogPage<Branch>> {
  return catalogPageSchema(branchSchema).parse(
    await requestJson(catalogPath('/api/v1/branches', query)),
  );
}
export async function getBranch(id: string): Promise<Branch> {
  return branchSchema.parse(
    await requestJson(`/api/v1/branches/${encodeURIComponent(id)}`),
  );
}
export async function createBranch(input: CreateBranch): Promise<Branch> {
  return branchSchema.parse(
    await requestJson('/api/v1/branches', 'POST', input),
  );
}
export async function updateBranch(
  id: string,
  input: Partial<CreateBranch>,
): Promise<Branch> {
  return branchSchema.parse(
    await requestJson(
      `/api/v1/branches/${encodeURIComponent(id)}`,
      'PATCH',
      input,
    ),
  );
}

export async function listCategories(
  query: CatalogQuery = {},
): Promise<CatalogPage<Category>> {
  return catalogPageSchema(categorySchema).parse(
    await requestJson(catalogPath('/api/v1/categories', query)),
  );
}
export async function getCategory(id: string): Promise<Category> {
  return categorySchema.parse(
    await requestJson(`/api/v1/categories/${encodeURIComponent(id)}`),
  );
}
export async function createCategory(input: CreateCategory): Promise<Category> {
  return categorySchema.parse(
    await requestJson('/api/v1/categories', 'POST', input),
  );
}
export async function updateCategory(
  id: string,
  input: Partial<CreateCategory>,
): Promise<Category> {
  return categorySchema.parse(
    await requestJson(
      `/api/v1/categories/${encodeURIComponent(id)}`,
      'PATCH',
      input,
    ),
  );
}

export async function listProducts(
  query: CatalogQuery = {},
): Promise<CatalogPage<Product>> {
  return catalogPageSchema(productSchema).parse(
    await requestJson(catalogPath('/api/v1/products', query)),
  );
}
export async function getProduct(id: string): Promise<Product> {
  return productSchema.parse(
    await requestJson(`/api/v1/products/${encodeURIComponent(id)}`),
  );
}
export async function createProduct(input: CreateProduct): Promise<Product> {
  return productSchema.parse(
    await requestJson('/api/v1/products', 'POST', input),
  );
}
export async function updateProduct(
  id: string,
  input: Partial<CreateProduct>,
): Promise<Product> {
  return productSchema.parse(
    await requestJson(
      `/api/v1/products/${encodeURIComponent(id)}`,
      'PATCH',
      input,
    ),
  );
}

export async function listSuppliers(
  query: CatalogQuery = {},
): Promise<CatalogPage<Supplier>> {
  return catalogPageSchema(supplierSchema).parse(
    await requestJson(catalogPath('/api/v1/suppliers', query)),
  );
}
export async function getSupplier(id: string): Promise<Supplier> {
  return supplierSchema.parse(
    await requestJson(`/api/v1/suppliers/${encodeURIComponent(id)}`),
  );
}
export async function createSupplier(input: CreateSupplier): Promise<Supplier> {
  return supplierSchema.parse(
    await requestJson('/api/v1/suppliers', 'POST', input),
  );
}
export async function updateSupplier(
  id: string,
  input: Partial<CreateSupplier>,
): Promise<Supplier> {
  return supplierSchema.parse(
    await requestJson(
      `/api/v1/suppliers/${encodeURIComponent(id)}`,
      'PATCH',
      input,
    ),
  );
}

export async function listWarehouses(
  query: CatalogQuery = {},
): Promise<CatalogPage<Warehouse>> {
  return catalogPageSchema(warehouseSchema).parse(
    await requestJson(catalogPath('/api/v1/warehouses', query)),
  );
}
export async function getWarehouse(id: string): Promise<Warehouse> {
  return warehouseSchema.parse(
    await requestJson(`/api/v1/warehouses/${encodeURIComponent(id)}`),
  );
}
export async function createWarehouse(
  input: CreateWarehouse,
): Promise<Warehouse> {
  return warehouseSchema.parse(
    await requestJson('/api/v1/warehouses', 'POST', input),
  );
}
export async function updateWarehouse(
  id: string,
  input: Partial<CreateWarehouse>,
): Promise<Warehouse> {
  return warehouseSchema.parse(
    await requestJson(
      `/api/v1/warehouses/${encodeURIComponent(id)}`,
      'PATCH',
      input,
    ),
  );
}
