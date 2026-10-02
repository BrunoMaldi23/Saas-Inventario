import { z } from 'zod';

const uuid = z.string().uuid();
const name = z.string().trim().min(1).max(120);
const optionalText = (limit: number) =>
  z.string().trim().min(1).max(limit).nullable();
const status = z.enum(['ACTIVE', 'INACTIVE']);

export const catalogQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(120).optional(),
    status: status.optional(),
  })
  .strict();

export const companyCreateSchema = z
  .object({
    name,
    taxId: optionalText(40).optional(),
    businessType: optionalText(80).optional(),
    status: status.optional(),
  })
  .strict();
export const companyUpdateSchema = companyCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0);

export const branchCreateSchema = z
  .object({
    companyId: uuid,
    name,
    address: optionalText(250).optional(),
    status: status.optional(),
  })
  .strict();
export const branchUpdateSchema = branchCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0);

export const categoryCreateSchema = z
  .object({
    name,
    parentId: uuid.nullable().optional(),
    status: status.optional(),
  })
  .strict();
export const categoryUpdateSchema = categoryCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0);

const code = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[A-Za-z0-9._-]+$/)
  .nullable();
const barcode = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[A-Za-z0-9]+$/)
  .nullable();
const minStock = z
  .string()
  .regex(/^\d{1,15}(?:\.\d{1,3})?$/)
  .nullable();
export const productCreateSchema = z
  .object({
    categoryId: uuid.nullable().optional(),
    sku: code.optional(),
    barcode: barcode.optional(),
    name,
    description: optionalText(2000).optional(),
    unitOfMeasure: z.string().trim().min(1).max(32),
    status: status.optional(),
    minStock: minStock.optional(),
  })
  .strict();
export const productUpdateSchema = productCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0);

export const supplierCreateSchema = z
  .object({
    name,
    taxId: optionalText(40).optional(),
    email: z.string().trim().email().max(254).nullable().optional(),
    phone: optionalText(40).optional(),
    status: status.optional(),
  })
  .strict();
export const supplierUpdateSchema = supplierCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0);

export const warehouseCreateSchema = z
  .object({
    branchId: uuid,
    name,
    type: z.string().trim().min(1).max(40),
    status: status.optional(),
  })
  .strict();
export const warehouseUpdateSchema = warehouseCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0);

const timestamps = {
  id: uuid,
  status,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
};
export const companySchema = z.object({
  ...timestamps,
  name: z.string(),
  taxId: z.string().nullable(),
  businessType: z.string().nullable(),
});
export const branchSchema = z.object({
  ...timestamps,
  companyId: uuid,
  name: z.string(),
  address: z.string().nullable(),
});
export const categorySchema = z.object({
  ...timestamps,
  name: z.string(),
  parentId: uuid.nullable(),
});
export const productSchema = z.object({
  ...timestamps,
  categoryId: uuid.nullable(),
  sku: z.string().nullable(),
  barcode: z.string().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  unitOfMeasure: z.string(),
  minStock: z.string().nullable(),
});
export const supplierSchema = z.object({
  ...timestamps,
  name: z.string(),
  taxId: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
});
export const warehouseSchema = z.object({
  ...timestamps,
  branchId: uuid,
  name: z.string(),
  type: z.string(),
});
export const catalogPageSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    page: z.number().int(),
    pageSize: z.number().int(),
    total: z.number().int(),
  });
