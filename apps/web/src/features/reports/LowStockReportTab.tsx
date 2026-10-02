import { useCallback, useState } from 'react';
import { listLowStockReport } from '@inventario/api-client';
import type { LowStockProductView } from '@inventario/types';
import { PagedTable } from '../../components/data/PagedTable';
import type { Column } from '../../components/ui/DataTable';
import { Field, SearchInput } from '../../components/ui/Field';
import { EmptyState } from '../../components/ui/States';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import { useApiQuery } from '../../session/useApiQuery';
import { formatDecimal } from '../catalog/format';

const PAGE_SIZE = 20;

const columns: Column<LowStockProductView>[] = [
  {
    key: 'product',
    header: 'Producto',
    primary: true,
    render: (item) => (
      <span>
        <span className="cell-strong">{item.product.name}</span>
        {item.product.sku && (
          <span className="cell-muted cell-block">
            <code>{item.product.sku}</code>
          </span>
        )}
      </span>
    ),
  },
  {
    key: 'category',
    header: 'Categoría',
    hideOnMobile: true,
    render: (item) => item.product.category?.name ?? '—',
  },
  {
    key: 'locations',
    header: 'Bodegas bajo mínimo',
    render: (item) => (
      <ul className="location-list">
        {item.locations.map((l) => (
          <li key={l.warehouse.id}>
            <span>{l.warehouse.name}</span>
            <span className="qty qty--out">
              {formatDecimal(l.quantity)} / {formatDecimal(l.minStock)}{' '}
              {item.product.unitOfMeasure}
            </span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    key: 'count',
    header: 'N.º bodegas',
    align: 'end',
    render: (item) => item.warehouseCount,
  },
];

/** GET /reports/low-stock: selección de bajo mínimo hecha por el backend. */
export function LowStockReportTab() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const term = useDebouncedValue(search.trim());
  const fetcher = useCallback(
    () =>
      listLowStockReport({
        page,
        pageSize: PAGE_SIZE,
        search: term || undefined,
      }),
    [page, term],
  );
  const { state, reload } = useApiQuery(fetcher);

  return (
    <>
      <div className="filters-grid" role="search" aria-label="Filtros">
        <Field label="Buscar">
          {(props) => (
            <SearchInput
              {...props}
              label="Buscar producto bajo mínimo"
              placeholder="Nombre o SKU"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          )}
        </Field>
      </div>
      <PagedTable
        state={state}
        caption="Productos bajo stock mínimo"
        columns={columns}
        getRowId={(item) => item.product.id}
        onRetry={reload}
        onPageChange={setPage}
        empty={
          term ? (
            <EmptyState
              icon="search"
              title="Sin resultados"
              description="Ningún producto bajo mínimo coincide con la búsqueda."
            />
          ) : (
            <EmptyState
              icon="checkCircle"
              title="No hay productos bajo stock mínimo."
              description="Todos los saldos con mínimo configurado están por sobre su umbral."
            />
          )
        }
      />
    </>
  );
}
