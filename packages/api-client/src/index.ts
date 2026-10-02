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
  InventoryQuery,
  MovementQuery,
  TransferQuery,
  StockOperationRequest,
  StockAdjustmentRequest,
  StockTransferRequest,
  StockOperationResponse,
  StockTransferResponse,
  InventoryBalanceView,
  StockMovementView,
  StockTransferView,
  AuthSessionResponse,
  AddMembershipByEmailRequest,
  ChangePasswordRequest,
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
  inventoryPageSchema,
  movementPageSchema,
  transferPageSchema,
  transferViewSchema,
  stockOperationResponseSchema,
  stockTransferResponseSchema,
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
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers:
        body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof TypeError)
      throw new ApiError({
        status: 0,
        code: 'NETWORK_ERROR',
        message: 'Network request failed',
      });
    throw error;
  }
  if (!response.ok) {
    let payload: { code?: unknown; message?: unknown; details?: unknown } = {};
    try {
      payload = await response.json();
    } catch {
      // Use a safe status-based fallback when the server did not return JSON.
    }
    const message =
      response.status >= 500
        ? 'The server could not complete the request'
        : typeof payload.message === 'string'
          ? payload.message
          : `Request failed (${response.status})`;
    throw new ApiError({
      status: response.status,
      code: typeof payload.code === 'string' ? payload.code : undefined,
      message,
      details: response.status >= 500 ? undefined : payload.details,
    });
  }
  if (response.status === 204) return undefined;
  return response.json();
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(input: {
    status: number;
    code?: string;
    message: string;
    details?: unknown;
  }) {
    super(input.message);
    this.name = 'ApiError';
    this.status = input.status;
    this.code = input.code;
    this.details = input.details;
  }
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

export async function changePassword(
  input: ChangePasswordRequest,
): Promise<void> {
  await requestJson('/api/v1/auth/change-password', 'POST', input);
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

export async function addMembershipByEmail(
  input: AddMembershipByEmailRequest,
): Promise<MembershipView> {
  return membershipViewSchema.parse(
    await requestJson('/api/v1/memberships/by-email', 'POST', input),
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

function inventoryPath(
  path: string,
  query: Record<string, string | number | boolean | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const suffix = params.toString();
  return suffix ? `${path}?${suffix}` : path;
}

export async function listInventory(
  query: InventoryQuery = {},
): Promise<CatalogPage<InventoryBalanceView>> {
  return inventoryPageSchema.parse(
    await requestJson(inventoryPath('/api/v1/inventory', query)),
  );
}
export async function listMovements(
  query: MovementQuery = {},
): Promise<CatalogPage<StockMovementView>> {
  return movementPageSchema.parse(
    await requestJson(inventoryPath('/api/v1/inventory/movements', query)),
  );
}
export async function recordInitialStock(
  input: StockOperationRequest,
): Promise<StockOperationResponse> {
  return stockOperationResponseSchema.parse(
    await requestJson('/api/v1/inventory/initial-stock', 'POST', input),
  );
}
export async function recordEntry(
  input: StockOperationRequest,
): Promise<StockOperationResponse> {
  return stockOperationResponseSchema.parse(
    await requestJson('/api/v1/inventory/entries', 'POST', input),
  );
}
export async function recordIssue(
  input: StockOperationRequest,
): Promise<StockOperationResponse> {
  return stockOperationResponseSchema.parse(
    await requestJson('/api/v1/inventory/issues', 'POST', input),
  );
}
export async function recordAdjustment(
  input: StockAdjustmentRequest,
): Promise<StockOperationResponse> {
  return stockOperationResponseSchema.parse(
    await requestJson('/api/v1/inventory/adjustments', 'POST', input),
  );
}
export async function listTransfers(
  query: TransferQuery = {},
): Promise<CatalogPage<StockTransferView>> {
  return transferPageSchema.parse(
    await requestJson(inventoryPath('/api/v1/transfers', query)),
  );
}
export async function getTransfer(id: string): Promise<StockTransferView> {
  return transferViewSchema.parse(
    await requestJson(`/api/v1/transfers/${encodeURIComponent(id)}`),
  );
}
export async function createTransfer(
  input: StockTransferRequest,
): Promise<StockTransferResponse> {
  return stockTransferResponseSchema.parse(
    await requestJson('/api/v1/transfers', 'POST', input),
  );
}
