import type { ReactNode } from 'react';
import { apiErrorMessage } from '../../lib/apiError';
import type { CatalogPage } from '@inventario/types';
import type { QueryState } from '../../session/useApiQuery';
import { DataTable, type Column } from '../ui/DataTable';
import { Pagination } from '../ui/Pagination';
import { ErrorState, ForbiddenState } from '../ui/States';

type PagedTableProps<T> = {
  state: QueryState<CatalogPage<T>>;
  caption: string;
  columns: Column<T>[];
  getRowId: (row: T) => string;
  empty: ReactNode;
  onRetry: () => void;
  onPageChange: (page: number) => void;
};

/**
 * Tabla paginada sobre una respuesta `{ items, page, pageSize, total }`:
 * resuelve carga, vacío, error, sin conexión y 403 de forma uniforme.
 */
export function PagedTable<T>({
  state,
  caption,
  columns,
  getRowId,
  empty,
  onRetry,
  onPageChange,
}: PagedTableProps<T>) {
  if (state.status === 'error' && state.kind === 'forbidden') {
    return <ForbiddenState />;
  }
  if (state.status === 'error') {
    return (
      <ErrorState
        icon={state.kind === 'unavailable' ? 'wifiOff' : 'alertTriangle'}
        description={apiErrorMessage(state.kind)}
        onRetry={onRetry}
      />
    );
  }
  const data = state.status === 'success' ? state.data : null;
  return (
    <>
      <DataTable
        caption={caption}
        columns={columns}
        rows={data?.items ?? []}
        getRowId={getRowId}
        status={state.status === 'loading' ? 'loading' : 'ready'}
        empty={empty}
      />
      {data && data.total > 0 && (
        <Pagination
          page={data.page}
          pageSize={data.pageSize}
          total={data.total}
          onPageChange={onPageChange}
        />
      )}
    </>
  );
}
