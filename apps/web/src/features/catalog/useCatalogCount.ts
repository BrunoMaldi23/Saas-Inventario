import { useCallback } from 'react';
import type { CatalogPage, CatalogQuery } from '../../lib/apiTypes';
import { useSession } from '../../session/sessionContext';
import { useApiQuery } from '../../session/useApiQuery';

/**
 * Cantidad de registros activos de un recurso, tomada del `total` que
 * devuelve la API (pageSize 1). Sin permiso de lectura no consulta.
 */
export function useCatalogCount<T>(
  list: (query: CatalogQuery) => Promise<CatalogPage<T>>,
  permission: string,
) {
  const { can } = useSession();
  const allowed = can(permission);
  const fetcher = useCallback(
    () =>
      allowed
        ? list({ page: 1, pageSize: 1, status: 'ACTIVE' }).then((p) => p.total)
        : Promise.resolve(null),
    [list, allowed],
  );
  const { state } = useApiQuery(fetcher);
  return {
    allowed,
    loading: state.status === 'loading',
    value: state.status === 'success' ? state.data : null,
    failed: state.status === 'error',
  };
}
