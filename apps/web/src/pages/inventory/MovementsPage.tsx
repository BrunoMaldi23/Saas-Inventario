import { useCallback, useMemo, useState } from 'react';
import {
  listMemberships,
  listMovements,
  listWarehouses,
} from '@inventario/api-client';
import { PagedTable } from '../../components/data/PagedTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import type { Column } from '../../components/ui/DataTable';
import { Field, Input, Select } from '../../components/ui/Field';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/States';
import type { MovementType, StockMovementView } from '@inventario/types';
import { Permission } from '../../lib/permissions';
import { Link } from '../../lib/router';
import { formatDecimal } from '../../features/catalog/format';
import { useCatalogOptions } from '../../features/catalog/useCatalogOptions';
import {
  dateRangeToIso,
  movementTypeLabels,
} from '../../features/inventory/inventoryLogic';
import { ProductPicker } from '../../features/inventory/ProductPicker';
import {
  useAuthenticatedSession,
  useSession,
} from '../../session/sessionContext';
import { useApiQuery } from '../../session/useApiQuery';

const PAGE_SIZE = 20;
const dateTime = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'short',
  timeStyle: 'short',
});

type Filters = {
  productId: string;
  warehouseId: string;
  type: MovementType | '';
  from: string;
  to: string;
  userId: string;
};

const noFilters: Filters = {
  productId: '',
  warehouseId: '',
  type: '',
  from: '',
  to: '',
  userId: '',
};

/** Historial de movimientos (kardex). No calcula saldos históricos. */
export function MovementsPage() {
  const { user } = useAuthenticatedSession();
  const { can } = useSession();
  const canReadUsers = can(Permission.UsersRead);
  const warehouses = useCatalogOptions(
    listWarehouses,
    Permission.WarehousesRead,
  );
  const membersFetcher = useCallback(
    () =>
      canReadUsers ? listMemberships() : Promise.resolve({ memberships: [] }),
    [canReadUsers],
  );
  const members = useApiQuery(membersFetcher);
  const [filters, setFilters] = useState<Filters>(noFilters);
  const [page, setPage] = useState(1);
  const [pickerKey, setPickerKey] = useState(0);
  const rangeInvalid =
    filters.from !== '' && filters.to !== '' && filters.from > filters.to;

  const fetcher = useCallback(() => {
    const range = rangeInvalid ? {} : dateRangeToIso(filters.from, filters.to);
    return listMovements({
      page,
      pageSize: PAGE_SIZE,
      productId: filters.productId || undefined,
      warehouseId: filters.warehouseId || undefined,
      type: filters.type || undefined,
      createdByUserId: filters.userId || undefined,
      ...range,
    });
  }, [page, filters, rangeInvalid]);
  const { state, reload } = useApiQuery(fetcher);

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };
  const hasFilters = Object.values(filters).some(Boolean);

  // Membresías solo para las opciones del filtro "Usuario".
  const memberOptions = useMemo(
    () =>
      members.state.status === 'success'
        ? members.state.data.memberships.map((m) => m.user)
        : [],
    [members.state],
  );

  const columns: Column<StockMovementView>[] = [
    {
      key: 'date',
      header: 'Fecha',
      render: (m) => dateTime.format(new Date(m.createdAt)),
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
      key: 'reason',
      header: 'Motivo',
      hideOnMobile: true,
      render: (m) => m.reason ?? '—',
    },
    {
      key: 'reference',
      header: 'Referencia',
      hideOnMobile: true,
      render: (m) =>
        m.transferId ? (
          <Link to="/transferencias">
            Transferencia {m.transferId.slice(0, 8)}
          </Link>
        ) : (
          '—'
        ),
    },
    {
      key: 'user',
      header: 'Usuario',
      render: (m) => (m.actor.id === user.id ? 'Tú' : m.actor.name),
    },
  ];

  return (
    <>
      <PageHeader
        title="Movimientos"
        description="Historial de entradas, salidas, ajustes y transferencias. Los más recientes primero."
      />
      <Card flush>
        <div className="filters-grid" role="search" aria-label="Filtros">
          <ProductPicker
            key={pickerKey}
            label="Producto"
            value={filters.productId}
            emptyLabel="Todos los productos"
            onChange={(product) => setFilter('productId', product?.id ?? '')}
          />
          <Field label="Bodega">
            {(props) => (
              <Select
                {...props}
                value={filters.warehouseId}
                onChange={(e) => setFilter('warehouseId', e.target.value)}
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
                value={filters.type}
                onChange={(e) =>
                  setFilter('type', e.target.value as MovementType | '')
                }
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
          <Field label="Desde">
            {(props) => (
              <Input
                {...props}
                type="date"
                value={filters.from}
                max={filters.to || undefined}
                onChange={(e) => setFilter('from', e.target.value)}
              />
            )}
          </Field>
          <Field
            label="Hasta"
            error={
              rangeInvalid ? 'Debe ser igual o posterior a "Desde".' : undefined
            }
          >
            {(props) => (
              <Input
                {...props}
                type="date"
                value={filters.to}
                min={filters.from || undefined}
                onChange={(e) => setFilter('to', e.target.value)}
              />
            )}
          </Field>
          {canReadUsers && (
            <Field label="Usuario">
              {(props) => (
                <Select
                  {...props}
                  value={filters.userId}
                  onChange={(e) => setFilter('userId', e.target.value)}
                >
                  <option value="">Todos los usuarios</option>
                  {memberOptions.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}
          {hasFilters && (
            <div className="filters-grid__actions">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setFilters(noFilters);
                  setPage(1);
                  setPickerKey((n) => n + 1);
                }}
              >
                Limpiar filtros
              </Button>
            </div>
          )}
        </div>
        <PagedTable
          state={state}
          caption="Movimientos de inventario"
          columns={columns}
          getRowId={(m) => m.id}
          onRetry={reload}
          onPageChange={setPage}
          empty={
            <EmptyState
              icon="movements"
              title={hasFilters ? 'Sin resultados' : 'Aún no hay movimientos'}
              description={
                hasFilters
                  ? 'No hay movimientos que coincidan con los filtros.'
                  : 'Cada operación de inventario quedará registrada aquí con fecha, usuario y motivo.'
              }
            />
          }
        />
      </Card>
    </>
  );
}
