import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  DashboardReport,
  InventoryBalanceView,
  LowStockProductView,
  MovementReport,
  MovementUnitTotal,
  ProductReport,
  ReportCatalogQuery,
  ReportDateQuery,
  ReportMovementQuery,
  StockReportQuery,
  WarehouseReport,
} from '@inventario/types';
import { DatabaseService } from './database.service';

type PageQuery = { page?: number; pageSize?: number };
function page(query: PageQuery) {
  const current = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;
  return {
    page: current,
    pageSize,
    skip: (current - 1) * pageSize,
    take: pageSize,
  };
}

const balanceInclude = {
  product: { select: { id: true, name: true, sku: true, minStock: true } },
  warehouse: { select: { id: true, name: true } },
} satisfies Prisma.InventoryBalanceInclude;
const movementInclude = {
  product: { select: { id: true, name: true, sku: true } },
  warehouse: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.StockMovementInclude;

function balanceView(
  row: Prisma.InventoryBalanceGetPayload<{ include: typeof balanceInclude }>,
): InventoryBalanceView {
  return {
    id: row.id,
    productId: row.productId,
    warehouseId: row.warehouseId,
    quantity: row.quantity.toString(),
    product: {
      id: row.product.id,
      name: row.product.name,
      sku: row.product.sku,
      minStock: row.product.minStock?.toString() ?? null,
    },
    warehouse: row.warehouse,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function movementView(
  row: Prisma.StockMovementGetPayload<{ include: typeof movementInclude }>,
) {
  return {
    id: row.id,
    productId: row.productId,
    warehouseId: row.warehouseId,
    transferId: row.transferId,
    type: row.type,
    direction: row.direction,
    quantity: row.quantity.toString(),
    reason: row.reason,
    createdByUserId: row.createdByUserId,
    product: row.product,
    warehouse: row.warehouse,
    actor: row.createdBy,
    createdAt: row.createdAt.toISOString(),
  };
}

function dates(query: ReportDateQuery, fallback: { from: Date; to: Date }) {
  return {
    from: query.from ? new Date(query.from) : fallback.from,
    to: query.to ? new Date(query.to) : fallback.to,
  };
}

type LowStockRow = {
  id: string;
  name: string;
  sku: string | null;
  unitOfMeasure: string;
  categoryId: string | null;
  categoryName: string | null;
  locations: LowStockProductView['locations'];
  warehouseCount: number;
};

@Injectable()
export class ReportsService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  private async lowStockProducts(
    tenantId: string,
    query: PageQuery & { search?: string },
  ) {
    const p = page(query);
    const filters = [
      Prisma.sql`p."tenantId" = ${tenantId}::uuid`,
      Prisma.sql`p."status" = 'ACTIVE'`,
      Prisma.sql`p."minStock" IS NOT NULL`,
      Prisma.sql`w."status" = 'ACTIVE'`,
      Prisma.sql`br."status" = 'ACTIVE'`,
      Prisma.sql`co."status" = 'ACTIVE'`,
      Prisma.sql`b."quantity" <= p."minStock"`,
    ];
    if (query.search) {
      const term = `%${query.search}%`;
      filters.push(
        Prisma.sql`(p."name" ILIKE ${term} OR p."sku" ILIKE ${term} OR p."barcode" ILIKE ${term})`,
      );
    }
    const condition = Prisma.join(filters, ' AND ');
    const [rows, counts] = await Promise.all([
      this.database.client.$queryRaw<LowStockRow[]>(Prisma.sql`
        SELECT p."id", p."name", p."sku", p."unitOfMeasure",
          c."id" AS "categoryId", c."name" AS "categoryName",
          json_agg(json_build_object(
            'warehouse', json_build_object('id', w."id", 'name', w."name"),
            'quantity', b."quantity"::text,
            'minStock', p."minStock"::text
          ) ORDER BY w."name", w."id") AS "locations",
          COUNT(DISTINCT w."id")::int AS "warehouseCount"
        FROM "InventoryBalance" b
        JOIN "Product" p ON p."id" = b."productId" AND p."tenantId" = b."tenantId"
        JOIN "Warehouse" w ON w."id" = b."warehouseId" AND w."tenantId" = b."tenantId"
        JOIN "Branch" br ON br."id" = w."branchId" AND br."tenantId" = w."tenantId"
        JOIN "Company" co ON co."id" = br."companyId" AND co."tenantId" = br."tenantId"
        LEFT JOIN "Category" c ON c."id" = p."categoryId" AND c."tenantId" = p."tenantId"
        WHERE ${condition}
        GROUP BY p."id", p."name", p."sku", p."unitOfMeasure", c."id", c."name"
        ORDER BY p."name", p."id" OFFSET ${p.skip} LIMIT ${p.take}`),
      this.database.client.$queryRaw<{ total: bigint }[]>(Prisma.sql`
        SELECT COUNT(DISTINCT p."id")::bigint AS total
        FROM "InventoryBalance" b
        JOIN "Product" p ON p."id" = b."productId" AND p."tenantId" = b."tenantId"
        JOIN "Warehouse" w ON w."id" = b."warehouseId" AND w."tenantId" = b."tenantId"
        JOIN "Branch" br ON br."id" = w."branchId" AND br."tenantId" = w."tenantId"
        JOIN "Company" co ON co."id" = br."companyId" AND co."tenantId" = br."tenantId"
        WHERE ${condition}`),
    ]);
    const items: LowStockProductView[] = rows.map((row) => ({
      product: {
        id: row.id,
        name: row.name,
        sku: row.sku,
        unitOfMeasure: row.unitOfMeasure,
        category:
          row.categoryId && row.categoryName
            ? { id: row.categoryId, name: row.categoryName }
            : null,
      },
      locations: row.locations.map((location) => ({
        ...location,
        quantity: new Prisma.Decimal(location.quantity).toString(),
        minStock: new Prisma.Decimal(location.minStock).toString(),
      })),
      warehouseCount: row.warehouseCount,
    }));
    const total = Number(counts[0]?.total ?? 0n);
    return {
      items,
      page: p.page,
      pageSize: p.pageSize,
      total,
      totalPages: Math.ceil(total / p.pageSize),
    };
  }

  async dashboard(
    tenantId: string,
    query: ReportDateQuery,
  ): Promise<DashboardReport> {
    const generatedAt = new Date();
    const todayFrom = new Date(
      Date.UTC(
        generatedAt.getUTCFullYear(),
        generatedAt.getUTCMonth(),
        generatedAt.getUTCDate(),
      ),
    );
    const todayRange = { from: todayFrom, to: generatedAt };
    const periodRange = dates(query, todayRange);
    const [
      activeProductCount,
      activeWarehouseCount,
      lowStockProductPage,
      lowStockCountRows,
      todayMovementCount,
      totals,
    ] = await Promise.all([
      this.database.client.product.count({
        where: { tenantId, status: 'ACTIVE' },
      }),
      this.database.client.warehouse.count({
        where: {
          tenantId,
          status: 'ACTIVE',
          branch: { status: 'ACTIVE', company: { status: 'ACTIVE' } },
        },
      }),
      this.lowStockProducts(tenantId, { page: 1, pageSize: 10 }),
      this.database.client.$queryRaw<
        { productCount: bigint; balanceCount: bigint }[]
      >(Prisma.sql`
        SELECT COUNT(DISTINCT p."id")::bigint AS "productCount", COUNT(*)::bigint AS "balanceCount"
        FROM "InventoryBalance" b
        JOIN "Product" p ON p."id" = b."productId" AND p."tenantId" = b."tenantId"
        JOIN "Warehouse" w ON w."id" = b."warehouseId" AND w."tenantId" = b."tenantId"
        JOIN "Branch" br ON br."id" = w."branchId" AND br."tenantId" = w."tenantId"
        JOIN "Company" co ON co."id" = br."companyId" AND co."tenantId" = br."tenantId"
        WHERE b."tenantId" = ${tenantId}::uuid AND p."status" = 'ACTIVE'
          AND w."status" = 'ACTIVE' AND br."status" = 'ACTIVE' AND co."status" = 'ACTIVE'
          AND p."minStock" IS NOT NULL AND b."quantity" <= p."minStock"`),
      this.database.client.stockMovement.count({
        where: { tenantId, createdAt: { gte: todayFrom, lte: generatedAt } },
      }),
      this.totalsByUnit(tenantId, { ...periodRange }),
    ]);
    const recent = await this.database.client.stockMovement.findMany({
      where: { tenantId, createdAt: { gte: todayFrom, lte: generatedAt } },
      include: movementInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 10,
    });
    const low = lowStockCountRows[0];
    return {
      generatedAt: generatedAt.toISOString(),
      todayRange: {
        from: todayFrom.toISOString(),
        to: generatedAt.toISOString(),
      },
      periodRange: {
        from: periodRange.from.toISOString(),
        to: periodRange.to.toISOString(),
      },
      activeProductCount,
      activeWarehouseCount,
      lowStockProductCount: Number(low?.productCount ?? 0n),
      lowStockBalanceCount: Number(low?.balanceCount ?? 0n),
      todayMovementCount,
      periodTotalsByUnit: totals,
      recentMovements: recent.map(movementView),
      lowStockProducts: lowStockProductPage.items,
    };
  }

  private async totalsByUnit(
    tenantId: string,
    range?: { from: Date; to: Date },
    filters: {
      productId?: string;
      warehouseId?: string;
      type?: string;
      createdByUserId?: string;
    } = {},
  ): Promise<MovementUnitTotal[]> {
    const where: Prisma.StockMovementWhereInput = {
      tenantId,
      createdAt: range ? { gte: range.from, lte: range.to } : undefined,
      productId: filters.productId,
      warehouseId: filters.warehouseId,
      type: filters.type as Prisma.EnumMovementTypeFilter['equals'] | undefined,
      createdByUserId: filters.createdByUserId,
    };
    const rows = await this.database.client.stockMovement.groupBy({
      by: ['direction', 'productId'],
      where,
      _sum: { quantity: true },
      _count: { _all: true },
    });
    if (!rows.length) return [];
    const productIds = [...new Set(rows.map((row) => row.productId))];
    const products = await this.database.client.product.findMany({
      where: { tenantId, id: { in: productIds } },
      select: { id: true, unitOfMeasure: true },
    });
    const units = new Map(
      products.map((product) => [product.id, product.unitOfMeasure]),
    );
    const totals = new Map<string, MovementUnitTotal>();
    for (const row of rows) {
      const unitOfMeasure = units.get(row.productId) ?? 'unknown';
      const key = `${unitOfMeasure}\u0000${row.direction}`;
      const current = totals.get(key) ?? {
        unitOfMeasure,
        direction: row.direction,
        quantity: '0',
        count: 0,
      };
      // Decimal arithmetic is delegated to Prisma's exact Decimal implementation.
      const quantity = new Prisma.Decimal(current.quantity).plus(
        row._sum.quantity ?? 0,
      );
      totals.set(key, {
        ...current,
        quantity: quantity.toString(),
        count: current.count + row._count._all,
      });
    }
    return [...totals.values()].sort(
      (a, b) =>
        a.unitOfMeasure.localeCompare(b.unitOfMeasure) ||
        a.direction.localeCompare(b.direction),
    );
  }

  async stock(tenantId: string, query: StockReportQuery) {
    const p = page(query);
    const search = query.search
      ? { contains: query.search, mode: 'insensitive' as const }
      : undefined;
    const where: Prisma.InventoryBalanceWhereInput = {
      tenantId,
      productId: query.productId,
      warehouseId: query.warehouseId,
      OR: query.search
        ? [
            { product: { name: search } },
            { product: { sku: search } },
            { product: { barcode: search } },
            { warehouse: { name: search } },
          ]
        : undefined,
    };
    const [rows, total] = await Promise.all([
      this.database.client.inventoryBalance.findMany({
        where,
        include: balanceInclude,
        skip: p.skip,
        take: p.take,
        orderBy: [
          { product: { name: 'asc' } },
          { warehouse: { name: 'asc' } },
          { id: 'asc' },
        ],
      }),
      this.database.client.inventoryBalance.count({ where }),
    ]);
    return {
      items: rows.map(balanceView),
      page: p.page,
      pageSize: p.pageSize,
      total,
      totalPages: Math.ceil(total / p.pageSize),
    };
  }

  lowStock(tenantId: string, query: PageQuery & { search?: string }) {
    return this.lowStockProducts(tenantId, query);
  }

  async movements(
    tenantId: string,
    query: ReportMovementQuery,
  ): Promise<MovementReport> {
    const p = page(query);
    const range =
      query.from && query.to
        ? { from: new Date(query.from), to: new Date(query.to) }
        : undefined;
    const where: Prisma.StockMovementWhereInput = {
      tenantId,
      productId: query.productId,
      warehouseId: query.warehouseId,
      type: query.type,
      createdByUserId: query.createdByUserId,
      createdAt: range ? { gte: range.from, lte: range.to } : undefined,
    };
    const [rows, total, totalsByUnit] = await Promise.all([
      this.database.client.stockMovement.findMany({
        where,
        include: movementInclude,
        skip: p.skip,
        take: p.take,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      this.database.client.stockMovement.count({ where }),
      this.totalsByUnit(tenantId, range, query),
    ]);
    return {
      items: rows.map(movementView),
      page: p.page,
      pageSize: p.pageSize,
      total,
      totalPages: Math.ceil(total / p.pageSize),
      totalsByUnit,
    };
  }

  async warehouses(
    tenantId: string,
    query: ReportCatalogQuery,
  ): Promise<WarehouseReport> {
    const p = page(query);
    const where: Prisma.WarehouseWhereInput = {
      tenantId,
      status: query.status,
      OR: query.search
        ? [
            { name: { contains: query.search, mode: 'insensitive' } },
            {
              branch: { name: { contains: query.search, mode: 'insensitive' } },
            },
          ]
        : undefined,
    };
    const [rows, total] = await Promise.all([
      this.database.client.warehouse.findMany({
        where,
        skip: p.skip,
        take: p.take,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          name: true,
          status: true,
          branch: { select: { id: true, name: true } },
        },
      }),
      this.database.client.warehouse.count({ where }),
    ]);
    const ids = rows.map((row) => row.id);
    const [balanceCounts, lowCounts] = ids.length
      ? await Promise.all([
          this.database.client.inventoryBalance.groupBy({
            by: ['warehouseId'],
            where: { tenantId, warehouseId: { in: ids } },
            _count: { productId: true },
          }),
          this.database.client.$queryRaw<
            { warehouseId: string; count: number }[]
          >(Prisma.sql`
        SELECT b."warehouseId", COUNT(*)::int AS count
        FROM "InventoryBalance" b JOIN "Product" p ON p."id" = b."productId" AND p."tenantId" = b."tenantId"
        JOIN "Warehouse" w ON w."id" = b."warehouseId" AND w."tenantId" = b."tenantId"
        JOIN "Branch" br ON br."id" = w."branchId" AND br."tenantId" = w."tenantId"
        JOIN "Company" co ON co."id" = br."companyId" AND co."tenantId" = br."tenantId"
        WHERE b."tenantId" = ${tenantId}::uuid AND b."warehouseId" IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))})
          AND p."status" = 'ACTIVE' AND w."status" = 'ACTIVE' AND br."status" = 'ACTIVE' AND co."status" = 'ACTIVE'
          AND p."minStock" IS NOT NULL AND b."quantity" <= p."minStock"
        GROUP BY b."warehouseId"`),
        ])
      : [[], []];
    const balanceByWarehouse = new Map(
      balanceCounts.map((item) => [item.warehouseId, item._count.productId]),
    );
    const lowByWarehouse = new Map(
      lowCounts.map((item) => [item.warehouseId, item.count]),
    );
    const items = rows.map((row) => ({
      ...row,
      balanceCount: balanceByWarehouse.get(row.id) ?? 0,
      productCount: balanceByWarehouse.get(row.id) ?? 0,
      lowStockBalanceCount: lowByWarehouse.get(row.id) ?? 0,
    }));
    return {
      items,
      page: p.page,
      pageSize: p.pageSize,
      total,
      totalPages: Math.ceil(total / p.pageSize),
    };
  }

  async products(
    tenantId: string,
    query: ReportCatalogQuery,
  ): Promise<ProductReport> {
    const p = page(query);
    const where: Prisma.ProductWhereInput = {
      tenantId,
      status: query.status,
      OR: query.search
        ? [
            { name: { contains: query.search, mode: 'insensitive' } },
            { sku: { contains: query.search, mode: 'insensitive' } },
            { barcode: { contains: query.search, mode: 'insensitive' } },
          ]
        : undefined,
    };
    const [rows, total] = await Promise.all([
      this.database.client.product.findMany({
        where,
        skip: p.skip,
        take: p.take,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          name: true,
          sku: true,
          status: true,
          unitOfMeasure: true,
          category: { select: { id: true, name: true } },
        },
      }),
      this.database.client.product.count({ where }),
    ]);
    const ids = rows.map((row) => row.id);
    const [balanceGroups, lowCounts] = ids.length
      ? await Promise.all([
          this.database.client.inventoryBalance.groupBy({
            by: ['productId'],
            where: { tenantId, productId: { in: ids } },
            _sum: { quantity: true },
            _count: { warehouseId: true },
          }),
          this.database.client.$queryRaw<
            { productId: string; count: number }[]
          >(Prisma.sql`
        SELECT b."productId", COUNT(*)::int AS count
        FROM "InventoryBalance" b JOIN "Product" p ON p."id" = b."productId" AND p."tenantId" = b."tenantId"
        JOIN "Warehouse" w ON w."id" = b."warehouseId" AND w."tenantId" = b."tenantId"
        JOIN "Branch" br ON br."id" = w."branchId" AND br."tenantId" = w."tenantId"
        JOIN "Company" co ON co."id" = br."companyId" AND co."tenantId" = br."tenantId"
        WHERE b."tenantId" = ${tenantId}::uuid AND b."productId" IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))})
          AND p."status" = 'ACTIVE' AND w."status" = 'ACTIVE' AND br."status" = 'ACTIVE' AND co."status" = 'ACTIVE'
          AND p."minStock" IS NOT NULL AND b."quantity" <= p."minStock"
        GROUP BY b."productId"`),
        ])
      : [[], []];
    const balances = new Map(
      balanceGroups.map((item) => [item.productId, item]),
    );
    const low = new Map(lowCounts.map((item) => [item.productId, item.count]));
    const items = rows.map((row) => {
      const balance = balances.get(row.id);
      return {
        ...row,
        totalOnHand: balance?._sum.quantity?.toString() ?? '0',
        warehouseCount: balance?._count.warehouseId ?? 0,
        lowStockWarehouseCount: low.get(row.id) ?? 0,
      };
    });
    return {
      items,
      page: p.page,
      pageSize: p.pageSize,
      total,
      totalPages: Math.ceil(total / p.pageSize),
    };
  }
}
