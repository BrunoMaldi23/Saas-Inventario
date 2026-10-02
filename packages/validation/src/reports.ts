import { z } from 'zod';
import { balanceViewSchema, movementViewSchema } from './inventory.js';

const uuid = z.string().uuid();
const paging = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};
const status = z.enum(['ACTIVE', 'INACTIVE']);
const date = z.string().datetime({ offset: true });
const dateRange = {
  from: date.optional(),
  to: date.optional(),
};
const validateRange = <T extends { from?: string; to?: string }>(
  schema: z.ZodType<T>,
) =>
  schema
    .refine(
      (value) => Boolean(value.from) === Boolean(value.to),
      'from and to must be provided together',
    )
    .refine(
      (value) => !value.from || Date.parse(value.from) <= Date.parse(value.to!),
      'Invalid date range',
    );

export const dashboardQuerySchema = validateRange(z.object(dateRange).strict());
export const stockReportQuerySchema = z
  .object({
    ...paging,
    productId: uuid.optional(),
    warehouseId: uuid.optional(),
    search: z.string().trim().max(120).optional(),
  })
  .strict();
export const lowStockReportQuerySchema = z
  .object({
    ...paging,
    search: z.string().trim().max(120).optional(),
  })
  .strict();
export const movementReportQuerySchema = validateRange(
  z
    .object({
      ...paging,
      ...dateRange,
      productId: uuid.optional(),
      warehouseId: uuid.optional(),
      type: z
        .enum(['INITIAL', 'ENTRY', 'ISSUE', 'ADJUSTMENT', 'TRANSFER'])
        .optional(),
      createdByUserId: uuid.optional(),
    })
    .strict(),
);
export const warehouseReportQuerySchema = z
  .object({
    ...paging,
    search: z.string().trim().max(120).optional(),
    status: status.optional(),
  })
  .strict();
export const productReportQuerySchema = z
  .object({
    ...paging,
    search: z.string().trim().max(120).optional(),
    status: status.optional(),
  })
  .strict();

const pageMeta = {
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
};
const movementUnitTotalSchema = z.object({
  unitOfMeasure: z.string(),
  direction: z.enum(['IN', 'OUT']),
  quantity: z.string(),
  count: z.number().int(),
});
export const lowStockLocationSchema = z.object({
  warehouse: z.object({ id: uuid, name: z.string() }),
  quantity: z.string(),
  minStock: z.string(),
});
export const lowStockProductSchema = z.object({
  product: z.object({
    id: uuid,
    name: z.string(),
    sku: z.string().nullable(),
    unitOfMeasure: z.string(),
    category: z.object({ id: uuid, name: z.string() }).nullable(),
  }),
  locations: z.array(lowStockLocationSchema),
  warehouseCount: z.number().int(),
});
export const lowStockReportSchema = z.object({
  items: z.array(lowStockProductSchema),
  ...pageMeta,
});
export const stockReportSchema = z.object({
  items: z.array(balanceViewSchema),
  ...pageMeta,
});
export const movementReportSchema = z.object({
  items: z.array(movementViewSchema),
  ...pageMeta,
  totalsByUnit: z.array(movementUnitTotalSchema),
});
export const warehouseReportSchema = z.object({
  items: z.array(
    z.object({
      id: uuid,
      name: z.string(),
      status,
      branch: z.object({ id: uuid, name: z.string() }),
      balanceCount: z.number().int(),
      productCount: z.number().int(),
      lowStockBalanceCount: z.number().int(),
    }),
  ),
  ...pageMeta,
});
export const productReportSchema = z.object({
  items: z.array(
    z.object({
      id: uuid,
      name: z.string(),
      sku: z.string().nullable(),
      status,
      unitOfMeasure: z.string(),
      category: z.object({ id: uuid, name: z.string() }).nullable(),
      totalOnHand: z.string(),
      warehouseCount: z.number().int(),
      lowStockWarehouseCount: z.number().int(),
    }),
  ),
  ...pageMeta,
});
export const dashboardReportSchema = z.object({
  generatedAt: z.string().datetime(),
  todayRange: z.object({
    from: z.string().datetime(),
    to: z.string().datetime(),
  }),
  periodRange: z.object({
    from: z.string().datetime(),
    to: z.string().datetime(),
  }),
  activeProductCount: z.number().int(),
  activeWarehouseCount: z.number().int(),
  lowStockProductCount: z.number().int(),
  lowStockBalanceCount: z.number().int(),
  todayMovementCount: z.number().int(),
  periodTotalsByUnit: z.array(movementUnitTotalSchema),
  recentMovements: z.array(movementViewSchema),
  lowStockProducts: z.array(lowStockProductSchema),
});
