/*
 * Lógica pura de inventario (sin React). Replica reglas publicadas en
 * docs/API_CONTRACTS.md para dar feedback inmediato; el backend sigue siendo
 * la autoridad (stock insuficiente, permisos, tenant).
 */
import type { ApiErrorKind } from '../../lib/apiError.ts';
import { hasPermission, Permission } from '../../lib/permissions.ts';

export type StockOperation =
  | 'initial'
  | 'entry'
  | 'issue'
  | 'adjustment'
  | 'transfer';

export type Direction = 'IN' | 'OUT';

/** Permiso requerido por cada operación (contrato de Fase 4). */
export const operationPermission: Record<StockOperation, string> = {
  initial: Permission.InventoryWrite,
  entry: Permission.InventoryWrite,
  issue: Permission.InventoryWrite,
  adjustment: Permission.InventoryAdjust,
  transfer: Permission.InventoryTransfer,
};

const OPERATION_ORDER: StockOperation[] = [
  'initial',
  'entry',
  'issue',
  'adjustment',
  'transfer',
];

/** Operaciones que la UI ofrece según los permisos del tenant activo. */
export function allowedOperations(
  permissions: readonly string[],
): StockOperation[] {
  return OPERATION_ORDER.filter((op) =>
    hasPermission(permissions, operationPermission[op]),
  );
}

export const operationLabels: Record<StockOperation, string> = {
  initial: 'Stock inicial',
  entry: 'Entrada',
  issue: 'Salida',
  adjustment: 'Ajuste',
  transfer: 'Transferencia',
};

export const movementTypeLabels = {
  INITIAL: 'Stock inicial',
  ENTRY: 'Entrada',
  ISSUE: 'Salida',
  ADJUSTMENT: 'Ajuste',
  TRANSFER: 'Transferencia',
} as const;

export type MovementTypeKey = keyof typeof movementTypeLabels;

// ---------- Cantidades ----------
const QUANTITY_PATTERN = /^(?:0|[1-9]\d{0,14})(?:\.\d{1,3})?$/;
const SCALE = 1000n;

/** "2,5" → "2.5"; quita espacios. No altera el valor numérico. */
export function normalizeQuantity(value: string): string {
  return value.trim().replace(',', '.');
}

/** Error de una cantidad según el contrato, o undefined si es válida. */
export function quantityError(value: string): string | undefined {
  const normalized = normalizeQuantity(value);
  if (!normalized) return 'Ingresa una cantidad.';
  if (!QUANTITY_PATTERN.test(normalized))
    return 'Usa un número positivo con hasta 3 decimales (sin ceros a la izquierda).';
  if (toMilli(normalized) === 0n) return 'La cantidad debe ser mayor que cero.';
  return undefined;
}

/** Decimal de hasta 3 cifras → entero en milésimas (sin errores de coma flotante). */
export function toMilli(value: string): bigint {
  const [int = '0', frac = ''] = value.split('.');
  return BigInt(int) * SCALE + BigInt((frac + '000').slice(0, 3));
}

/** Compara dos decimales del contrato: -1, 0 o 1. */
export function compareDecimal(a: string, b: string): number {
  const diff = toMilli(a) - toMilli(b);
  return diff === 0n ? 0 : diff > 0n ? 1 : -1;
}

/**
 * Indica si un saldo está bajo su mínimo con la misma regla del filtro
 * `lowStock` del backend (cantidad <= minStock). Solo para resaltar filas.
 */
export function isLowStock(quantity: string, minStock: string | null): boolean {
  return minStock !== null && compareDecimal(quantity, minStock) <= 0;
}

// ---------- Formulario de operación ----------
export type OperationValues = {
  productId: string;
  warehouseId: string;
  /** Solo transferencias. */
  toWarehouseId: string;
  quantity: string;
  /** Solo ajustes. */
  direction: Direction | '';
  reason: string;
};

export type OperationErrors = Partial<Record<keyof OperationValues, string>>;

export const emptyOperation: OperationValues = {
  productId: '',
  warehouseId: '',
  toWarehouseId: '',
  quantity: '',
  direction: '',
  reason: '',
};

/** Saldo conocido del par producto-bodega de origen (null si no se sabe). */
export type KnownBalance = { exists: boolean; quantity: string } | null;

/** Indica si la operación descuenta stock del origen. */
export function decreasesStock(
  op: StockOperation,
  direction: Direction | '',
): boolean {
  return (
    op === 'issue' ||
    op === 'transfer' ||
    (op === 'adjustment' && direction === 'OUT')
  );
}

export type OperationPayload =
  | {
      kind: 'stock';
      body: {
        productId: string;
        warehouseId: string;
        quantity: string;
        reason?: string;
      };
    }
  | {
      kind: 'adjustment';
      body: {
        productId: string;
        warehouseId: string;
        quantity: string;
        direction: Direction;
        reason: string;
      };
    }
  | {
      kind: 'transfer';
      body: {
        productId: string;
        fromWarehouseId: string;
        toWarehouseId: string;
        quantity: string;
        reason?: string;
      };
    };

export function validateOperation(
  op: StockOperation,
  values: OperationValues,
  balance: KnownBalance,
):
  | { ok: true; payload: OperationPayload }
  | { ok: false; errors: OperationErrors } {
  const errors: OperationErrors = {};
  const quantity = normalizeQuantity(values.quantity);
  const reason = values.reason.trim();

  if (!values.productId) errors.productId = 'Selecciona un producto.';
  if (!values.warehouseId)
    errors.warehouseId =
      op === 'transfer'
        ? 'Selecciona la bodega de origen.'
        : 'Selecciona una bodega.';
  errors.quantity = quantityError(values.quantity);

  if (op === 'transfer') {
    if (!values.toWarehouseId)
      errors.toWarehouseId = 'Selecciona la bodega de destino.';
    else if (values.toWarehouseId === values.warehouseId)
      errors.toWarehouseId = 'El destino debe ser distinto del origen.';
  }
  if (op === 'adjustment') {
    if (!values.direction)
      errors.direction = 'Indica si el ajuste aumenta o disminuye el stock.';
    if (!reason) errors.reason = 'El motivo es obligatorio en un ajuste.';
  }
  if (reason.length > 500) errors.reason = 'Máximo 500 caracteres.';

  // Con saldo conocido se evita ofrecer operaciones que el backend rechazará.
  if (op === 'initial' && balance?.exists) {
    errors.warehouseId =
      'Este producto ya tiene stock en esta bodega. Usa una entrada o un ajuste.';
  }
  if (
    !errors.quantity &&
    balance &&
    decreasesStock(op, values.direction) &&
    compareDecimal(quantity, balance.quantity) > 0
  ) {
    errors.quantity = 'La cantidad supera el stock disponible en la bodega.';
  }

  const clean = Object.fromEntries(
    Object.entries(errors).filter(([, message]) => message),
  ) as OperationErrors;
  if (Object.keys(clean).length > 0) return { ok: false, errors: clean };

  const optionalReason = reason ? { reason } : {};
  if (op === 'adjustment') {
    return {
      ok: true,
      payload: {
        kind: 'adjustment',
        body: {
          productId: values.productId,
          warehouseId: values.warehouseId,
          quantity,
          direction: values.direction as Direction,
          reason,
        },
      },
    };
  }
  if (op === 'transfer') {
    return {
      ok: true,
      payload: {
        kind: 'transfer',
        body: {
          productId: values.productId,
          fromWarehouseId: values.warehouseId,
          toWarehouseId: values.toWarehouseId,
          quantity,
          ...optionalReason,
        },
      },
    };
  }
  return {
    ok: true,
    payload: {
      kind: 'stock',
      body: {
        productId: values.productId,
        warehouseId: values.warehouseId,
        quantity,
        ...optionalReason,
      },
    },
  };
}

/** Mensaje de error de una operación de inventario según el contrato. */
export function operationErrorMessage(
  op: StockOperation,
  kind: ApiErrorKind,
): string {
  switch (kind) {
    case 'conflict':
      return op === 'initial'
        ? 'Este producto ya tiene stock inicial en esta bodega. Usa una entrada o un ajuste.'
        : 'Stock insuficiente: la operación dejaría el saldo en negativo. No se registró ningún movimiento.';
    case 'not-found':
      return 'El producto o la bodega no está disponible (puede estar inactivo). Actualiza e inténtalo nuevamente.';
    case 'invalid':
      return 'El servidor rechazó los datos. Revisa la cantidad y los campos.';
    case 'forbidden':
      return 'Tu rol no permite realizar esta operación.';
    case 'unavailable':
      return 'No pudimos conectar con el servidor. La operación no se registró.';
    case 'unauthorized':
      return 'Tu sesión expiró. Vuelve a iniciar sesión.';
    case 'unexpected':
      return 'Ocurrió un error inesperado. Verifica en Movimientos antes de reintentar.';
  }
}

// ---------- Fechas ----------
/**
 * Convierte un rango de fechas locales (yyyy-mm-dd de <input type="date">) a
 * los extremos ISO con zona que exige el contrato (ambos inclusivos).
 */
export function dateRangeToIso(
  from: string,
  to: string,
): { from?: string; to?: string } {
  const range: { from?: string; to?: string } = {};
  if (from) range.from = new Date(`${from}T00:00:00`).toISOString();
  if (to) range.to = new Date(`${to}T23:59:59.999`).toISOString();
  return range;
}

/** Inicio y fin del día local de `now`, en ISO con zona. */
export function todayRange(now: Date = new Date()): {
  from: string;
  to: string;
} {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}
