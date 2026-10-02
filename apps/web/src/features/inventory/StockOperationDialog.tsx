import { useState } from 'react';
import {
  createTransfer,
  listWarehouses,
  recordAdjustment,
  recordEntry,
  recordInitialStock,
  recordIssue,
} from '@inventario/api-client';
import { Field, Input, Select } from '../../components/ui/Field';
import { Notice } from '../../components/ui/States';
import { classifyApiError } from '../../lib/apiError';
import { Permission } from '../../lib/permissions';
import { useSession } from '../../session/sessionContext';
import { EntityFormDialog } from '../catalog/EntityFormDialog';
import { formatDecimal } from '../catalog/format';
import { useCatalogOptions } from '../catalog/useCatalogOptions';
import {
  decreasesStock,
  emptyOperation,
  operationErrorMessage,
  validateOperation,
  type Direction,
  type OperationErrors,
  type OperationPayload,
  type OperationValues,
  type StockOperation,
} from './inventoryLogic';
import { ProductPicker, type ProductOption } from './ProductPicker';
import { useKnownBalance } from './useKnownBalance';

const titles: Record<StockOperation, string> = {
  initial: 'Registrar stock inicial',
  entry: 'Registrar entrada',
  issue: 'Registrar salida',
  adjustment: 'Registrar ajuste',
  transfer: 'Nueva transferencia',
};

const submitLabels: Record<StockOperation, string> = {
  initial: 'Registrar stock inicial',
  entry: 'Registrar entrada',
  issue: 'Registrar salida',
  adjustment: 'Registrar ajuste',
  transfer: 'Transferir',
};

export type OperationPrefill = {
  product?: ProductOption;
  warehouseId?: string;
};

type StockOperationDialogProps = {
  operation: StockOperation;
  prefill?: OperationPrefill;
  onCancel: () => void;
  /** Mensaje de éxito construido con la respuesta real del backend. */
  onDone: (message: string) => void;
};

async function send(op: StockOperation, payload: OperationPayload) {
  switch (payload.kind) {
    case 'adjustment':
      return recordAdjustment(payload.body);
    case 'transfer':
      return createTransfer(payload.body);
    case 'stock':
      if (op === 'initial') return recordInitialStock(payload.body);
      if (op === 'issue') return recordIssue(payload.body);
      return recordEntry(payload.body);
  }
}

export function StockOperationDialog({
  operation,
  prefill,
  onCancel,
  onDone,
}: StockOperationDialogProps) {
  const { expireSession } = useSession();
  const warehouses = useCatalogOptions(
    listWarehouses,
    Permission.WarehousesRead,
  );
  const [values, setValues] = useState<OperationValues>({
    ...emptyOperation,
    productId: prefill?.product?.id ?? '',
    warehouseId: prefill?.warehouseId ?? '',
  });
  const [unit, setUnit] = useState(prefill?.product?.unitOfMeasure);
  const [errors, setErrors] = useState<OperationErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const known = useKnownBalance(values.productId, values.warehouseId);

  const set = <K extends keyof OperationValues>(
    key: K,
    value: OperationValues[K],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const activeWarehouses = warehouses.items.filter(
    (w) => w.status === 'ACTIVE',
  );
  const isTransfer = operation === 'transfer';
  const showsAvailability =
    decreasesStock(operation, values.direction) || operation === 'initial';

  const submit = async () => {
    setFormError(null);
    const result = validateOperation(operation, values, known.balance);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setSubmitting(true);
    try {
      const response = await send(operation, result.payload);
      if ('transfer' in response) {
        onDone(
          `Transferencia registrada. Origen: ${formatDecimal(response.source.quantity)} · Destino: ${formatDecimal(response.destination.quantity)}.`,
        );
      } else {
        onDone(
          `Movimiento registrado. Nuevo saldo: ${formatDecimal(response.balance.quantity)}.`,
        );
      }
    } catch (error) {
      const kind = classifyApiError(error);
      if (kind === 'unauthorized') return expireSession();
      setFormError(operationErrorMessage(operation, kind));
      // El saldo pudo cambiar (p. ej. otra persona registró una salida).
      known.reload();
      setSubmitting(false);
    }
  };

  const warehouseSelect = (
    key: 'warehouseId' | 'toWarehouseId',
    label: string,
  ) => (
    <Field
      label={label}
      error={errors[key]}
      hint={warehouses.failed ? 'No pudimos cargar las bodegas.' : undefined}
    >
      {(props) => (
        <Select
          {...props}
          value={values[key]}
          onChange={(e) => set(key, e.target.value)}
        >
          <option value="" disabled>
            {warehouses.loading ? 'Cargando bodegas…' : 'Selecciona una bodega'}
          </option>
          {activeWarehouses.map((w) => (
            <option
              key={w.id}
              value={w.id}
              disabled={key === 'toWarehouseId' && w.id === values.warehouseId}
            >
              {w.name}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );

  return (
    <EntityFormDialog
      title={titles[operation]}
      submitLabel={submitLabels[operation]}
      submitting={submitting}
      formError={formError}
      onSubmit={() => void submit()}
      onCancel={onCancel}
    >
      {operation === 'initial' && (
        <Notice tone="info">
          El stock inicial registra el primer saldo de un producto en una
          bodega. Se hace una sola vez; después usa entradas, salidas o ajustes.
        </Notice>
      )}

      <ProductPicker
        label="Producto"
        value={values.productId}
        initial={prefill?.product ?? null}
        activeOnly
        error={errors.productId}
        onChange={(product) => {
          set('productId', product?.id ?? '');
          setUnit(product?.unitOfMeasure);
        }}
      />

      {isTransfer ? (
        <div className="form-row">
          {warehouseSelect('warehouseId', 'Bodega de origen')}
          {warehouseSelect('toWarehouseId', 'Bodega de destino')}
        </div>
      ) : (
        warehouseSelect('warehouseId', 'Bodega')
      )}

      {values.productId && values.warehouseId && (
        <p className="balance-hint" aria-live="polite">
          {known.loading
            ? 'Consultando saldo actual…'
            : known.balance === null
              ? 'No pudimos consultar el saldo actual.'
              : known.balance.exists
                ? `Saldo actual en ${isTransfer ? 'origen' : 'la bodega'}: ${formatDecimal(known.balance.quantity)}${unit ? ` ${unit}` : ''}`
                : showsAvailability
                  ? 'Este producto aún no tiene stock en esta bodega (saldo 0).'
                  : 'Sin saldo previo en esta bodega.'}
        </p>
      )}

      {operation === 'adjustment' && (
        <fieldset className="choice-group">
          <legend className="field__label">Tipo de ajuste</legend>
          {(
            [
              ['IN', 'Aumentar stock', 'Suma la cantidad al saldo actual.'],
              ['OUT', 'Disminuir stock', 'Resta la cantidad del saldo actual.'],
            ] as Array<[Direction, string, string]>
          ).map(([direction, title, description]) => (
            <label key={direction} className="choice">
              <input
                type="radio"
                name="adjustment-direction"
                value={direction}
                checked={values.direction === direction}
                onChange={() => set('direction', direction)}
              />
              <span>
                <span className="choice__title">{title}</span>
                <span className="choice__description">{description}</span>
              </span>
            </label>
          ))}
          {errors.direction && (
            <p className="field__error">{errors.direction}</p>
          )}
        </fieldset>
      )}

      <Field
        label={unit ? `Cantidad (${unit})` : 'Cantidad'}
        hint="Número positivo, hasta 3 decimales."
        error={errors.quantity}
      >
        {(props) => (
          <Input
            {...props}
            value={values.quantity}
            inputMode="decimal"
            autoComplete="off"
            onChange={(e) => set('quantity', e.target.value)}
          />
        )}
      </Field>

      <Field
        label={operation === 'adjustment' ? 'Motivo' : 'Motivo o referencia'}
        hint={
          operation === 'adjustment'
            ? 'Obligatorio. Ej.: merma, rotura, diferencia de conteo.'
            : 'Opcional. Ej.: n.º de guía o factura.'
        }
        error={errors.reason}
      >
        {(props) => (
          <Input
            {...props}
            value={values.reason}
            maxLength={500}
            onChange={(e) => set('reason', e.target.value)}
          />
        )}
      </Field>
    </EntityFormDialog>
  );
}
