import { useCallback, useState } from 'react';
import { listStockReport, listWarehouses } from '@inventario/api-client';
import type { InventoryBalanceView } from '@inventario/types';
import { PagedTable } from '../../components/data/PagedTable';
import { Badge } from '../../components/ui/Badge';
import type { Column } from '../../components/ui/DataTable';
import { Field, SearchInput, Select } from '../../components/ui/Field';
import { EmptyState } from '../../components/ui/States';
import { Permission } from '../../lib/permissions';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import { useApiQuery } from '../../session/useApiQuery';
import { formatDecimal } from '../catalog/format';
import { useCatalogOptions } from '../catalog/useCatalogOptions';
import { isLowStock } from '../inventory/inventoryLogic';
import { ProductPicker } from '../inventory/ProductPicker';

const PAGE_SIZE = 20;

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
    // Marca visual con la regla publicada (cantidad <= mínimo); la selección
    // oficial de bajo mínimo está en la pestaña correspondiente.
    render: (b) =>
      isLowStock(b.quantity, b.product.minStock) ? (
        <Badge tone="warning" dot>
          Bajo mínimo
        </Badge>
      ) : (
        <span className="cell-muted">—</span>
      ),
  },
];

/** GET /reports/stock: saldos actuales (incluye productos/bodegas inactivos). */
export function StockReportTab() {
  const warehouses = useCatalogOptions(
    listWarehouses,
    Permission.WarehousesRead,
  );
  const [search, setSearch] = useState('');
  const [productId, setProductId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [page, setPage] = useState(1);
  const term = useDebouncedValue(search.trim());

  const fetcher = useCallback(
    () =>
      listStockReport({
        page,
        pageSize: PAGE_SIZE,
        search: term || undefined,
        productId: productId || undefined,
        warehouseId: warehouseId || undefined,
      }),
    [page, term, productId, warehouseId],
  );
  const { state, reload } = useApiQuery(fetcher);
  const filtered = Boolean(term || productId || warehouseId);

  return (
    <>
      <div className="filters-grid" role="search" aria-label="Filtros">
        <Field label="Buscar">
          {(props) => (
            <SearchInput
              {...props}
              label="Buscar producto en el reporte"
              placeholder="Nombre o SKU"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          )}
        </Field>
        <ProductPicker
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
      </div>
      <PagedTable
        state={state}
        caption="Reporte de stock actual"
        columns={columns}
        getRowId={(b) => b.id}
        onRetry={reload}
        onPageChange={setPage}
        empty={
          <EmptyState
            icon={filtered ? 'search' : 'layers'}
            title={filtered ? 'Sin resultados' : 'Aún no hay stock registrado'}
            description={
              filtered
                ? 'Ningún saldo coincide con los filtros.'
                : 'El reporte mostrará los saldos cuando se registre stock.'
            }
          />
        }
      />
    </>
  );
}
