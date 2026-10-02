import { useCallback, useState } from 'react';
import type {
  CatalogPage,
  CatalogQuery,
  AccountStatus,
} from '@inventario/types';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import { useApiQuery } from '../../session/useApiQuery';

export const PAGE_SIZE = 20;

/**
 * Listado paginado con búsqueda (debounce) y filtro de estado, según el
 * contrato de catálogo: page, pageSize, search y status.
 */
export function useCatalogList<T>(
  list: (query: CatalogQuery) => Promise<CatalogPage<T>>,
) {
  const [search, setSearchValue] = useState('');
  const [status, setStatusValue] = useState<AccountStatus | ''>('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search.trim());

  const fetcher = useCallback(
    () =>
      list({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: status || undefined,
      }),
    [list, page, debouncedSearch, status],
  );
  const { state, reload } = useApiQuery(fetcher);

  // Cambiar un filtro vuelve a la primera página.
  const setSearch = useCallback((value: string) => {
    setSearchValue(value);
    setPage(1);
  }, []);
  const setStatus = useCallback((value: AccountStatus | '') => {
    setStatusValue(value);
    setPage(1);
  }, []);
  const clearFilters = useCallback(() => {
    setSearchValue('');
    setStatusValue('');
    setPage(1);
  }, []);

  return {
    state,
    reload,
    search,
    setSearch,
    status,
    setStatus,
    page,
    setPage,
    clearFilters,
    hasFilters: search.trim() !== '' || status !== '',
  };
}
