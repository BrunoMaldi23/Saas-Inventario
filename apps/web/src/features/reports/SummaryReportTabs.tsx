import { useCallback, useState } from 'react';
import { listProductReport, listWarehouseReport } from '@inventario/api-client';
import type {
  AccountStatus,
  CatalogPage,
  ProductReportView,
  ReportCatalogQuery,
  WarehouseReportView,
} from '@inventario/types';
import { PagedTable } from '../../components/data/PagedTable';
import { Badge } from '../../components/ui/Badge';
import type { Column } from '../../components/ui/DataTable';
import { Field, SearchInput, Select } from '../../components/ui/Field';
import type { IconName } from '../../components/ui/Icon';
import { RecordStatusBadge } from '../../components/ui/RecordStatusBadge';
import { EmptyState } from '../../components/ui/States';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import { useApiQuery } from '../../session/useApiQuery';
import { formatDecimal } from '../catalog/format';

const PAGE_SIZE = 20;

type SummaryTabProps<T> = {
  list: (query: ReportCatalogQuery) => Promise<CatalogPage<T>>;
  columns: Column<T>[];
  caption: string;
  searchLabel: string;
  icon: IconName;
  emptyTitle: string;
  getRowId: (row: T) => string;
};

/** Resumen paginado con búsqueda y estado (contrato ReportCatalogQuery). */
function SummaryTab<T>({
  list,
  columns,
  caption,
  searchLabel,
  icon,
  emptyTitle,
  getRowId,
}: SummaryTabProps<T>) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<AccountStatus | ''>('');
  const [page, setPage] = useState(1);
  const term = useDebouncedValue(search.trim());
  const fetcher = useCallback(
    () =>
      list({
        page,
        pageSize: PAGE_SIZE,
        search: term || undefined,
        status: status || undefined,
      }),
    [list, page, term, status],
  );
  const { state, reload } = useApiQuery(fetcher);
  const filtered = Boolean(term || status);

  return (
    <>
      <div className="filters-grid" role="search" aria-label="Filtros">
        <Field label="Buscar">
          {(props) => (
            <SearchInput
              {...props}
              label={searchLabel}
              placeholder="Nombre"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          )}
        </Field>
        <Field label="Estado">
          {(props) => (
            <Select
              {...props}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as AccountStatus | '');
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              <option value="ACTIVE">Activos</option>
              <option value="INACTIVE">Inactivos</option>
            </Select>
          )}
        </Field>
      </div>
      <PagedTable
        state={state}
        caption={caption}
        columns={columns}
        getRowId={getRowId}
        onRetry={reload}
        onPageChange={setPage}
        empty={
          <EmptyState
            icon={filtered ? 'search' : icon}
            title={filtered ? 'Sin resultados' : emptyTitle}
          />
        }
      />
    </>
  );
}

function LowCount({ value }: { value: number }) {
  return value > 0 ? (
    <Badge tone="warning">{value}</Badge>
  ) : (
    <span className="cell-muted">0</span>
  );
}

const warehouseColumns: Column<WarehouseReportView>[] = [
  {
    key: 'name',
    header: 'Bodega',
    primary: true,
    render: (w) => <span className="cell-strong">{w.name}</span>,
  },
  { key: 'branch', header: 'Sucursal', render: (w) => w.branch.name },
  {
    key: 'status',
    header: 'Estado',
    render: (w) => <RecordStatusBadge status={w.status} />,
  },
  {
    key: 'products',
    header: 'Productos',
    align: 'end',
    render: (w) => w.productCount,
  },
  {
    key: 'balances',
    header: 'Saldos',
    align: 'end',
    render: (w) => w.balanceCount,
  },
  {
    key: 'low',
    header: 'Saldos bajo mínimo',
    align: 'end',
    render: (w) => <LowCount value={w.lowStockBalanceCount} />,
  },
];

/** GET /reports/warehouses: conteos por bodega (sin sumar cantidades). */
export function WarehouseReportTab() {
  return (
    <SummaryTab
      list={listWarehouseReport}
      columns={warehouseColumns}
      caption="Resumen por bodega"
      searchLabel="Buscar bodega"
      icon="warehouse"
      emptyTitle="Aún no hay bodegas"
      getRowId={(w) => w.id}
    />
  );
}

const productColumns: Column<ProductReportView>[] = [
  {
    key: 'name',
    header: 'Producto',
    primary: true,
    render: (p) => <span className="cell-strong">{p.name}</span>,
  },
  {
    key: 'sku',
    header: 'SKU',
    render: (p) => (p.sku ? <code>{p.sku}</code> : '—'),
  },
  {
    key: 'category',
    header: 'Categoría',
    hideOnMobile: true,
    render: (p) => p.category?.name ?? '—',
  },
  {
    key: 'status',
    header: 'Estado',
    render: (p) => <RecordStatusBadge status={p.status} />,
  },
  {
    key: 'onHand',
    header: 'Stock total',
    align: 'end',
    // Suma del backend del mismo producto (una sola unidad) en sus bodegas.
    render: (p) => (
      <span className="cell-strong">
        {formatDecimal(p.totalOnHand)} {p.unitOfMeasure}
      </span>
    ),
  },
  {
    key: 'warehouses',
    header: 'Bodegas',
    align: 'end',
    render: (p) => p.warehouseCount,
  },
  {
    key: 'low',
    header: 'Bodegas bajo mínimo',
    align: 'end',
    render: (p) => <LowCount value={p.lowStockWarehouseCount} />,
  },
];

/** GET /reports/products: stock total por producto, con su unidad. */
export function ProductReportTab() {
  return (
    <SummaryTab
      list={listProductReport}
      columns={productColumns}
      caption="Resumen por producto"
      searchLabel="Buscar producto"
      icon="box"
      emptyTitle="Aún no hay productos"
      getRowId={(p) => p.id}
    />
  );
}
