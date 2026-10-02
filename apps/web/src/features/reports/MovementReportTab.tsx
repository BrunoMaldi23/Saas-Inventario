import { useCallback, useState } from 'react';
import { listMovementReport, listWarehouses } from '@inventario/api-client';
import type { MovementType, StockMovementView } from '@inventario/types';
import { PagedTable } from '../../components/data/PagedTable';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import type { Column } from '../../components/ui/DataTable';
import { Field, Select } from '../../components/ui/Field';
import { EmptyState, Skeleton } from '../../components/ui/States';
import { Permission } from '../../lib/permissions';
import { useAuthenticatedSession } from '../../session/sessionContext';
import { useApiQuery } from '../../session/useApiQuery';
import { formatDecimal } from '../catalog/format';
import { useCatalogOptions } from '../catalog/useCatalogOptions';
import { movementTypeLabels } from '../inventory/inventoryLogic';
import { ProductPicker } from '../inventory/ProductPicker';
import { formatUtc } from './formatUtc';
import { PeriodFilter, type PeriodValue } from './PeriodFilter';
import { buildRange, periodLabels, rangeQuery } from './reportLogic';
import { UnitTotals } from './UnitTotals';

const PAGE_SIZE = 20;

/** GET /reports/movements: página de movimientos + totales por unidad. */
export function MovementReportTab() {
  const { user } = useAuthenticatedSession();
  const warehouses = useCatalogOptions(
    listWarehouses,
    Permission.WarehousesRead,
  );
  const [period, setPeriod] = useState<PeriodValue>({
    preset: 'last7',
    from: '',
    to: '',
  });
  const [productId, setProductId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [type, setType] = useState<MovementType | ''>('');
  const [page, setPage] = useState(1);
  const range = buildRange(period.preset, period);

  // Con un rango personalizado incompleto se conserva la última consulta
  // válida: el contrato exige from y to juntos.
  const rangeKey = range.ok ? JSON.stringify(range.range) : null;
  const [lastValidRange, setLastValidRange] = useState(rangeKey);
  if (rangeKey !== null && rangeKey !== lastValidRange) {
    setLastValidRange(rangeKey);
    setPage(1);
  }

  const fetcher = useCallback(
    () =>
      listMovementReport({
        page,
        pageSize: PAGE_SIZE,
        productId: productId || undefined,
        warehouseId: warehouseId || undefined,
        type: type || undefined,
        ...rangeQuery(lastValidRange ? JSON.parse(lastValidRange) : null),
      }),
    [page, productId, warehouseId, type, lastValidRange],
  );
  const { state, reload } = useApiQuery(fetcher);
  const resetPage = () => setPage(1);

  const columns: Column<StockMovementView>[] = [
    {
      key: 'date',
      header: 'Fecha (UTC)',
      render: (m) => formatUtc(m.createdAt),
    },
    {
      key: 'product',
      header: 'Producto',
      primary: true,
      render: (m) => <span className="cell-strong">{m.product.name}</span>,
    },
    { key: 'warehouse', header: 'Bodega', render: (m) => m.warehouse.name },
    {
      key: 'type',
      header: 'Tipo',
      render: (m) => movementTypeLabels[m.type],
    },
    {
      key: 'quantity',
      header: 'Cantidad',
      align: 'end',
      render: (m) => (
        <Badge tone={m.direction === 'IN' ? 'success' : 'danger'}>
          <span className="sr-only">
            {m.direction === 'IN' ? 'Entrada de' : 'Salida de'}
          </span>
          {m.direction === 'IN' ? '+' : '−'}
          {formatDecimal(m.quantity)}
        </Badge>
      ),
    },
    {
      key: 'actor',
      header: 'Usuario',
      render: (m) => (m.actor.id === user.id ? 'Tú' : m.actor.name),
    },
    {
      key: 'reference',
      header: 'Referencia',
      hideOnMobile: true,
      render: (m) =>
        m.transferId ? `Transferencia ${m.transferId.slice(0, 8)}` : '—',
    },
  ];

  return (
    <>
      <div className="filters-grid" role="search" aria-label="Filtros">
        <PeriodFilter
          value={period}
          onChange={setPeriod}
          error={range.ok ? undefined : range.error}
        />
        <ProductPicker
          label="Producto"
          value={productId}
          emptyLabel="Todos los productos"
          onChange={(product) => {
            setProductId(product?.id ?? '');
            resetPage();
          }}
        />
        <Field label="Bodega">
          {(props) => (
            <Select
              {...props}
              value={warehouseId}
              onChange={(e) => {
                setWarehouseId(e.target.value);
                resetPage();
              }}
            >
              <option value="">Todas las bodegas</option>
              {warehouses.items.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Tipo">
          {(props) => (
            <Select
              {...props}
              value={type}
              onChange={(e) => {
                setType(e.target.value as MovementType | '');
                resetPage();
              }}
            >
              <option value="">Todos los tipos</option>
              {Object.entries(movementTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <div className="report-summary">
        <Card
          title="Totales por unidad"
          description={`${periodLabels[period.preset]} · con los filtros aplicados. Una transferencia cuenta como salida en origen y entrada en destino.`}
        >
          {state.status === 'success' ? (
            <UnitTotals
              totals={state.data.totalsByUnit}
              emptyText="Sin movimientos con estos filtros."
            />
          ) : state.status === 'loading' ? (
            <div className="stack">
              <Skeleton width="60%" />
              <Skeleton width="40%" />
            </div>
          ) : (
            <p className="cell-muted">No disponible.</p>
          )}
        </Card>
      </div>

      <PagedTable
        state={state}
        caption="Reporte de movimientos"
        columns={columns}
        getRowId={(m) => m.id}
        onRetry={reload}
        onPageChange={setPage}
        empty={
          <EmptyState
            icon="movements"
            title="Sin movimientos"
            description="No hay movimientos en el período y con los filtros seleccionados."
          />
        }
      />
    </>
  );
}
