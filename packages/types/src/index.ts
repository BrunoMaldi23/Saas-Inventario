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
export type ChangePasswordRequest = {
  currentPassword: string;
  newPassword: string;
};
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

export type MovementType =
  | 'INITIAL'
  | 'ENTRY'
  | 'ISSUE'
  | 'ADJUSTMENT'
  | 'TRANSFER';
export type MovementDirection = 'IN' | 'OUT';
export type InventoryBalanceView = {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: string;
  product: {
    id: string;
    name: string;
    sku: string | null;
    minStock: string | null;
  };
  warehouse: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
};
export type StockMovementView = {
  id: string;
  productId: string;
  warehouseId: string;
  transferId: string | null;
  type: MovementType;
  direction: MovementDirection;
  quantity: string;
  reason: string | null;
  createdByUserId: string;
  createdAt: string;
};
export type StockTransferView = {
  id: string;
  productId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: string;
  status: 'COMPLETED';
  reason: string | null;
  createdByUserId: string;
  createdAt: string;
  completedAt: string;
};
export type StockOperationRequest = {
  productId: string;
  warehouseId: string;
  quantity: string;
  reason?: string;
};
export type StockAdjustmentRequest = StockOperationRequest & {
  direction: MovementDirection;
  reason: string;
};
export type StockTransferRequest = {
  productId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: string;
  reason?: string;
};
export type InventoryQuery = {
  page?: number;
  pageSize?: number;
  productId?: string;
  warehouseId?: string;
  lowStock?: boolean;
};
export type MovementQuery = {
  page?: number;
  pageSize?: number;
  productId?: string;
  warehouseId?: string;
  type?: MovementType;
  from?: string;
  to?: string;
  createdByUserId?: string;
};
export type TransferQuery = {
  page?: number;
  pageSize?: number;
  productId?: string;
};
export type StockOperationResponse = {
  balance: InventoryBalanceView;
  movement: StockMovementView;
};
export type StockTransferResponse = {
  transfer: StockTransferView;
  source: InventoryBalanceView;
  destination: InventoryBalanceView;
  movements: [StockMovementView, StockMovementView];
};
