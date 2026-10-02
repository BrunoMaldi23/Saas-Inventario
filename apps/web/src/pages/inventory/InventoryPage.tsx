import { useCallback, useState } from 'react';
import { listInventory, listWarehouses } from '@inventario/api-client';
import { PagedTable } from '../../components/data/PagedTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import type { Column } from '../../components/ui/DataTable';
import { Field, Select } from '../../components/ui/Field';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/States';
import { useToast } from '../../components/ui/toastContext';
import type { InventoryBalanceView } from '@inventario/types';
import { Permission } from '../../lib/permissions';
import { formatDecimal } from '../../features/catalog/format';
import { useCatalogOptions } from '../../features/catalog/useCatalogOptions';
import {
  allowedOperations,
  isLowStock,
  operationLabels,
  type StockOperation,
} from '../../features/inventory/inventoryLogic';
import { ProductPicker } from '../../features/inventory/ProductPicker';
import {
  StockOperationDialog,
  type OperationPrefill,
} from '../../features/inventory/StockOperationDialog';
import { useActiveTenant } from '../../session/sessionContext';
import { useApiQuery } from '../../session/useApiQuery';

const PAGE_SIZE = 20;

/** Etiqueta corta para las acciones por fila. */
const rowActionLabels: Partial<Record<StockOperation, string>> = {
  entry: 'Entrada',
  issue: 'Salida',
  adjustment: 'Ajustar',
  transfer: 'Transferir',
};

type OpenOperation = { operation: StockOperation; prefill?: OperationPrefill };

export function InventoryPage() {
  const { permissions } = useActiveTenant();
  const { notify } = useToast();
  const warehouses = useCatalogOptions(
    listWarehouses,
    Permission.WarehousesRead,
  );
  const [productId, setProductId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<OpenOperation | null>(null);
  // Remonta el selector de producto al limpiar filtros.
  const [pickerKey, setPickerKey] = useState(0);

  const fetcher = useCallback(
    () =>
      listInventory({
        page,
        pageSize: PAGE_SIZE,
        productId: productId || undefined,
        warehouseId: warehouseId || undefined,
        lowStock: lowStock || undefined,
      }),
    [page, productId, warehouseId, lowStock],
  );
  const { state, reload } = useApiQuery(fetcher);
  const operations = allowedOperations(permissions);
  const rowOperations = operations.filter((op) => op !== 'initial');
  const hasFilters = Boolean(productId || warehouseId || lowStock);

  const clearFilters = () => {
    setProductId('');
    setWarehouseId('');
    setLowStock(false);
    setPage(1);
    setPickerKey((n) => n + 1);
  };

  const columns: Column<InventoryBalanceView>[] = [
    {
      key: 'product',
      header: 'Producto',
      primary: true,
      render: (b) => <span className="cell-strong">{b.product.name}</span>,
    },
    {
      key: 'sku',
      header: 'SKU',
      hideOnMobile: true,
      render: (b) => (b.product.sku ? <code>{b.product.sku}</code> : '—'),
    },
    { key: 'warehouse', header: 'Bodega', render: (b) => b.warehouse.name },
    {
      key: 'quantity',
      header: 'Cantidad',
      align: 'end',
      render: (b) => (
        <span className="cell-strong">{formatDecimal(b.quantity)}</span>
      ),
    },
    {
      key: 'minStock',
      header: 'Stock mínimo',
      align: 'end',
      render: (b) => formatDecimal(b.product.minStock),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (b) =>
        isLowStock(b.quantity, b.product.minStock) ? (
          <Badge tone="warning" dot>
            Bajo mínimo
          </Badge>
        ) : b.product.minStock === null ? (
          <span className="cell-muted">Sin mínimo</span>
        ) : (
          <Badge tone="success" dot>
            Sobre mínimo
          </Badge>
        ),
    },
  ];

  if (rowOperations.length > 0) {
    columns.push({
      key: 'actions',
      header: 'Acciones',
      align: 'end',
      render: (b) => (
        <span className="row-actions">
          {rowOperations.map((op) => (
            <Button
              key={op}
              size="sm"
              variant="ghost"
              aria-label={`${operationLabels[op]}: ${b.product.name} en ${b.warehouse.name}`}
              onClick={() =>
                setOpen({
                  operation: op,
                  prefill: {
                    product: {
                      id: b.product.id,
                      name: b.product.name,
                      sku: b.product.sku,
                    },
                    warehouseId: b.warehouseId,
                  },
                })
              }
            >
              {rowActionLabels[op]}
            </Button>
          ))}
        </span>
      ),
    });
  }

  const empty = hasFilters ? (
    <EmptyState
      icon={lowStock ? 'checkCircle' : 'search'}
      title={lowStock ? 'Nada bajo el mínimo' : 'Sin resultados'}
      description={
        lowStock
          ? 'Ningún saldo con los filtros elegidos está bajo su stock mínimo.'
          : 'No hay saldos que coincidan con los filtros.'
      }
      action={<Button onClick={clearFilters}>Limpiar filtros</Button>}
    />
  ) : (
    <EmptyState
      icon="layers"
      title="Aún no hay stock registrado"
      description="Los saldos aparecen al registrar stock inicial o entradas de productos en una bodega."
      action={
        operations.includes('initial') && (
          <Button
            variant="primary"
            icon="plus"
            onClick={() => setOpen({ operation: 'initial' })}
          >
            Registrar stock inicial
          </Button>
        )
      }
    />
  );

  return (
    <>
      <PageHeader
        title="Inventario"
        description="Saldo actual por producto y bodega, informado por el servidor."
      />
      <div className="stack">
        {operations.length > 0 && (
          <Card>
            <div className="operations-bar">
              <span className="operations-bar__label">Registrar</span>
              <div className="cluster">
                {operations.map((op) => (
                  <Button
                    key={op}
                    size="sm"
                    variant={op === 'entry' ? 'primary' : 'secondary'}
                    onClick={() => setOpen({ operation: op })}
                  >
                    {operationLabels[op]}
                  </Button>
                ))}
              </div>
            </div>
          </Card>
        )}

        <Card flush>
          <div className="filters-grid" role="search" aria-label="Filtros">
            <ProductPicker
              key={pickerKey}
              label="Producto"
              value={productId}
              emptyLabel="Todos los productos"
              onChange={(product) => {
                setProductId(product?.id ?? '');
                setPage(1);
              }}
            />
            <Field label="Bodega">
              {(props) => (
                <Select
                  {...props}
                  value={warehouseId}
                  onChange={(e) => {
                    setWarehouseId(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Todas las bodegas</option>
                  {warehouses.items.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                      {w.status === 'INACTIVE' ? ' (inactiva)' : ''}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={lowStock}
                onChange={(e) => {
                  setLowStock(e.target.checked);
                  setPage(1);
                }}
              />
              Solo bajo stock mínimo
            </label>
          </div>
          <PagedTable
            state={state}
            caption="Saldos de inventario"
            columns={columns}
            getRowId={(b) => b.id}
            empty={empty}
            onRetry={reload}
            onPageChange={setPage}
          />
        </Card>
      </div>

      {open && (
        <StockOperationDialog
          operation={open.operation}
          prefill={open.prefill}
          onCancel={() => setOpen(null)}
          onDone={(message) => {
            setOpen(null);
            notify(message);
            reload();
          }}
        />
      )}
    </>
  );
}
