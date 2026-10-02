/*
 * Validación de formularios de catálogo. Replica las reglas publicadas en
 * docs/API_CONTRACTS.md para dar feedback inmediato; el backend sigue
 * validando y sus errores se muestran igualmente.
 */
import type {
  Branch,
  Category,
  Company,
  CreateBranch,
  CreateCategory,
  CreateCompany,
  CreateProduct,
  CreateSupplier,
  CreateWarehouse,
  Product,
  Supplier,
  Warehouse,
} from '../../lib/apiTypes.ts';
import {
  checkOptional,
  checkRequired,
  finish,
  textOrNull,
  type FieldErrors,
  type FormSpec,
} from './formUtils.ts';

const NAME_MAX = 120;
const SKU_PATTERN = /^[A-Za-z0-9._-]+$/;
const BARCODE_PATTERN = /^[A-Za-z0-9]+$/;
const MIN_STOCK_PATTERN = /^\d{1,15}(?:\.\d{1,3})?$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Acepta coma decimal ("2,5") y la normaliza al formato del contrato ("2.5"). */
export function normalizeDecimal(value: string): string {
  return value.trim().replace(',', '.');
}

// ---------- Producto ----------
export type ProductValues = {
  name: string;
  sku: string;
  barcode: string;
  categoryId: string;
  unitOfMeasure: string;
  minStock: string;
  description: string;
};

export const productSpec: FormSpec<ProductValues, CreateProduct, Product> = {
  empty: {
    name: '',
    sku: '',
    barcode: '',
    categoryId: '',
    unitOfMeasure: '',
    minStock: '',
    description: '',
  },
  fromRecord: (p) => ({
    name: p.name,
    sku: p.sku ?? '',
    barcode: p.barcode ?? '',
    categoryId: p.categoryId ?? '',
    unitOfMeasure: p.unitOfMeasure,
    minStock: p.minStock ?? '',
    description: p.description ?? '',
  }),
  validate: (v) => {
    const errors: FieldErrors<ProductValues> = {};
    errors.name = checkRequired(v.name, NAME_MAX);
    errors.unitOfMeasure = checkRequired(v.unitOfMeasure, 32);
    const sku = v.sku.trim();
    if (sku.length > 80) errors.sku = 'Máximo 80 caracteres.';
    else if (sku && !SKU_PATTERN.test(sku))
      errors.sku = 'Usa letras sin tilde, números, punto, guion o guion bajo.';
    const barcode = v.barcode.trim();
    if (barcode.length > 80) errors.barcode = 'Máximo 80 caracteres.';
    else if (barcode && !BARCODE_PATTERN.test(barcode))
      errors.barcode = 'Solo letras sin tilde y números.';
    const minStock = normalizeDecimal(v.minStock);
    if (minStock && !MIN_STOCK_PATTERN.test(minStock))
      errors.minStock = 'Número no negativo con hasta 3 decimales.';
    errors.description = checkOptional(v.description, 2000);
    return finish(clean(errors), () => ({
      name: v.name.trim(),
      sku: textOrNull(v.sku),
      barcode: textOrNull(v.barcode),
      categoryId: textOrNull(v.categoryId),
      unitOfMeasure: v.unitOfMeasure.trim(),
      minStock: textOrNull(minStock),
      description: textOrNull(v.description),
    }));
  },
};

// ---------- Bodega ----------
export type WarehouseValues = { name: string; branchId: string; type: string };

export const warehouseSpec: FormSpec<
  WarehouseValues,
  CreateWarehouse,
  Warehouse
> = {
  empty: { name: '', branchId: '', type: '' },
  fromRecord: (w) => ({ name: w.name, branchId: w.branchId, type: w.type }),
  validate: (v) => {
    const errors: FieldErrors<WarehouseValues> = {
      name: checkRequired(v.name, NAME_MAX),
      type: checkRequired(v.type, 40),
      branchId: v.branchId ? undefined : 'Selecciona una sucursal.',
    };
    return finish(clean(errors), () => ({
      name: v.name.trim(),
      branchId: v.branchId,
      type: v.type.trim(),
    }));
  },
};

// ---------- Proveedor ----------
export type SupplierValues = {
  name: string;
  taxId: string;
  email: string;
  phone: string;
};

export const supplierSpec: FormSpec<SupplierValues, CreateSupplier, Supplier> =
  {
    empty: { name: '', taxId: '', email: '', phone: '' },
    fromRecord: (s) => ({
      name: s.name,
      taxId: s.taxId ?? '',
      email: s.email ?? '',
      phone: s.phone ?? '',
    }),
    validate: (v) => {
      const email = v.email.trim();
      const errors: FieldErrors<SupplierValues> = {
        name: checkRequired(v.name, NAME_MAX),
        taxId: checkOptional(v.taxId, 40),
        phone: checkOptional(v.phone, 40),
        email:
          email.length > 254
            ? 'Máximo 254 caracteres.'
            : email && !EMAIL_PATTERN.test(email)
              ? 'Ingresa un correo válido.'
              : undefined,
      };
      return finish(clean(errors), () => ({
        name: v.name.trim(),
        taxId: textOrNull(v.taxId),
        email: textOrNull(v.email),
        phone: textOrNull(v.phone),
      }));
    },
  };

// ---------- Categoría ----------
export type CategoryValues = { name: string; parentId: string };

export const categorySpec: FormSpec<CategoryValues, CreateCategory, Category> =
  {
    empty: { name: '', parentId: '' },
    fromRecord: (c) => ({ name: c.name, parentId: c.parentId ?? '' }),
    validate: (v) =>
      finish(clean({ name: checkRequired(v.name, NAME_MAX) }), () => ({
        name: v.name.trim(),
        parentId: textOrNull(v.parentId),
      })),
  };

// ---------- Empresa ----------
export type CompanyValues = {
  name: string;
  taxId: string;
  businessType: string;
};

export const companySpec: FormSpec<CompanyValues, CreateCompany, Company> = {
  empty: { name: '', taxId: '', businessType: '' },
  fromRecord: (c) => ({
    name: c.name,
    taxId: c.taxId ?? '',
    businessType: c.businessType ?? '',
  }),
  validate: (v) =>
    finish(
      clean({
        name: checkRequired(v.name, NAME_MAX),
        taxId: checkOptional(v.taxId, 40),
        businessType: checkOptional(v.businessType, 80),
      }),
      () => ({
        name: v.name.trim(),
        taxId: textOrNull(v.taxId),
        businessType: textOrNull(v.businessType),
      }),
    ),
};

// ---------- Sucursal ----------
export type BranchValues = { name: string; companyId: string; address: string };

export const branchSpec: FormSpec<BranchValues, CreateBranch, Branch> = {
  empty: { name: '', companyId: '', address: '' },
  fromRecord: (b) => ({
    name: b.name,
    companyId: b.companyId,
    address: b.address ?? '',
  }),
  validate: (v) =>
    finish(
      clean({
        name: checkRequired(v.name, NAME_MAX),
        address: checkOptional(v.address, 250),
        companyId: v.companyId ? undefined : 'Selecciona una empresa.',
      }),
      () => ({
        name: v.name.trim(),
        companyId: v.companyId,
        address: textOrNull(v.address),
      }),
    ),
};

/** Quita entradas sin error para que "sin claves" signifique válido. */
function clean<V>(errors: FieldErrors<V>): FieldErrors<V> {
  const result: FieldErrors<V> = {};
  for (const key of Object.keys(errors) as Array<keyof V>) {
    if (errors[key]) result[key] = errors[key];
  }
  return result;
}

// ---------- Usuario (POST /users) ----------
export type UserValues = {
  name: string;
  email: string;
  password: string;
  roleId: string;
};

type CreateUserPayload = UserValues;

/** Alta de usuario: crea la identidad y su membresía en la cuenta activa. */
export const userSpec: FormSpec<UserValues, CreateUserPayload, { id: string }> =
  {
    empty: { name: '', email: '', password: '', roleId: '' },
    fromRecord: () => {
      throw new Error('Los usuarios no se editan con este formulario.');
    },
    validate: (v) => {
      const email = v.email.trim();
      return finish(
        clean<UserValues>({
          name: checkRequired(v.name, NAME_MAX),
          email: !email
            ? 'Este campo es obligatorio.'
            : email.length > 254 || !EMAIL_PATTERN.test(email)
              ? 'Ingresa un correo válido.'
              : undefined,
          password:
            v.password.length < 8
              ? 'Debe tener al menos 8 caracteres.'
              : v.password.length > 1024
                ? 'Máximo 1024 caracteres.'
                : undefined,
          roleId: v.roleId ? undefined : 'Selecciona un rol.',
        }),
        () => ({
          name: v.name.trim(),
          email: email.toLowerCase(),
          password: v.password,
          roleId: v.roleId,
        }),
      );
    },
  };
