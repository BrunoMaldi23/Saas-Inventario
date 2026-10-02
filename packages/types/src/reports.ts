import type {
  CatalogPage,
  MovementType,
  MovementDirection,
  AccountStatus,
} from './index.js';
import type { StockMovementView, InventoryBalanceView } from './index.js';

export type ReportRange = { from: string; to: string };
export type ReportDateQuery = { from?: string; to?: string };
export type ReportPaginationQuery = {
  page?: number;
  pageSize?: number;
};
export type StockReportQuery = ReportPaginationQuery & {
  productId?: string;
  warehouseId?: string;
  search?: string;
};
export type ReportMovementQuery = ReportPaginationQuery &
  ReportDateQuery & {
    productId?: string;
    warehouseId?: string;
    type?: MovementType;
    createdByUserId?: string;
  };
export type ReportCatalogQuery = ReportPaginationQuery & {
  search?: string;
  status?: AccountStatus;
};
export type MovementUnitTotal = {
  unitOfMeasure: string;
  direction: MovementDirection;
  quantity: string;
  count: number;
};
export type DashboardReport = {
  generatedAt: string;
  todayRange: ReportRange;
  periodRange: ReportRange;
  activeProductCount: number;
  activeWarehouseCount: number;
  lowStockProductCount: number;
  lowStockBalanceCount: number;
  todayMovementCount: number;
  periodTotalsByUnit: MovementUnitTotal[];
  recentMovements: StockMovementView[];
  lowStockProducts: LowStockProductView[];
};
export type LowStockLocation = {
  warehouse: { id: string; name: string };
  quantity: string;
  minStock: string;
};
export type LowStockProductView = {
  product: {
    id: string;
    name: string;
    sku: string | null;
    unitOfMeasure: string;
    category: { id: string; name: string } | null;
  };
  locations: LowStockLocation[];
  warehouseCount: number;
};
export type LowStockReport = CatalogPage<LowStockProductView>;
export type StockReport = CatalogPage<InventoryBalanceView>;
export type MovementReport = CatalogPage<StockMovementView> & {
  totalsByUnit: MovementUnitTotal[];
};
export type WarehouseReportView = {
  id: string;
  name: string;
  status: AccountStatus;
  branch: { id: string; name: string };
  balanceCount: number;
  productCount: number;
  lowStockBalanceCount: number;
};
export type WarehouseReport = CatalogPage<WarehouseReportView>;
export type ProductReportView = {
  id: string;
  name: string;
  sku: string | null;
  status: AccountStatus;
  unitOfMeasure: string;
  category: { id: string; name: string } | null;
  totalOnHand: string;
  warehouseCount: number;
  lowStockWarehouseCount: number;
};
export type ProductReport = CatalogPage<ProductReportView>;
