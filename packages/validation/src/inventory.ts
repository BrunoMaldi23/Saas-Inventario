import { z } from 'zod';

const uuid = z.string().uuid();
const paging = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};
const quantity = z
  .string()
  .regex(/^(?:0|[1-9]\d{0,14})(?:\.\d{1,3})?$/)
  .refine(
    (value) => !/^0(?:\.0{1,3})?$/.test(value),
    'Quantity must be positive',
  );
const reason = z.string().trim().min(1).max(500);
const direction = z.enum(['IN', 'OUT']);
const movementType = z.enum([
  'INITIAL',
  'ENTRY',
  'ISSUE',
  'ADJUSTMENT',
  'TRANSFER',
]);

export const stockOperationSchema = z
  .object({
    productId: uuid,
    warehouseId: uuid,
    quantity,
    reason: reason.optional(),
  })
  .strict();
export const stockAdjustmentSchema = stockOperationSchema.extend({
  direction,
  reason,
});
export const stockTransferSchema = z
  .object({
    productId: uuid,
    fromWarehouseId: uuid,
    toWarehouseId: uuid,
    quantity,
    reason: reason.optional(),
  })
  .strict()
  .refine(
    (value) => value.fromWarehouseId !== value.toWarehouseId,
    'Warehouses must differ',
  );

export const inventoryQuerySchema = z
  .object({
    ...paging,
    productId: uuid.optional(),
    warehouseId: uuid.optional(),
    lowStock: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
  })
  .strict();
export const movementQuerySchema = z
  .object({
    ...paging,
    productId: uuid.optional(),
    warehouseId: uuid.optional(),
    type: movementType.optional(),
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
    createdByUserId: uuid.optional(),
  })
  .strict()
  .refine(
    (value) =>
      !value.from ||
      !value.to ||
      Date.parse(value.from) <= Date.parse(value.to),
    'Invalid date range',
  );
export const transferQuerySchema = z
  .object({
    ...paging,
    productId: uuid.optional(),
  })
  .strict();

const date = z.string().datetime();
export const balanceViewSchema = z.object({
  id: uuid,
  productId: uuid,
  warehouseId: uuid,
  quantity: z.string(),
  product: z.object({
    id: uuid,
    name: z.string(),
    sku: z.string().nullable(),
    minStock: z.string().nullable(),
  }),
  warehouse: z.object({ id: uuid, name: z.string() }),
  createdAt: date,
  updatedAt: date,
});
export const movementViewSchema = z.object({
  id: uuid,
  productId: uuid,
  warehouseId: uuid,
  transferId: uuid.nullable(),
  type: movementType,
  direction,
  quantity: z.string(),
  reason: z.string().nullable(),
  createdByUserId: uuid,
  createdAt: date,
});
export const transferViewSchema = z.object({
  id: uuid,
  productId: uuid,
  fromWarehouseId: uuid,
  toWarehouseId: uuid,
  quantity: z.string(),
  status: z.literal('COMPLETED'),
  reason: z.string().nullable(),
  createdByUserId: uuid,
  createdAt: date,
  completedAt: date,
});
export const stockOperationResponseSchema = z.object({
  balance: balanceViewSchema,
  movement: movementViewSchema,
});
export const stockTransferResponseSchema = z.object({
  transfer: transferViewSchema,
  source: balanceViewSchema,
  destination: balanceViewSchema,
  movements: z.tuple([movementViewSchema, movementViewSchema]),
});
export const inventoryPageSchema = z.object({
  items: z.array(balanceViewSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});
export const movementPageSchema = z.object({
  items: z.array(movementViewSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});
export const transferPageSchema = z.object({
  items: z.array(transferViewSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});
