import { useCallback } from 'react';
import { useSession } from '../../session/sessionContext';
import { useApiQuery } from '../../session/useApiQuery';

/**
 * Total real informado por un listado paginado (se pide pageSize 1 y se usa
 * `total`). Sin el permiso de lectura no consulta y devuelve null.
 */
export function useTotal(
  fetchPage: () => Promise<{ total: number }>,
  permission: string,
) {
  const { can } = useSession();
  const allowed = can(permission);
  const fetcher = useCallback(
    () =>
      allowed ? fetchPage().then((page) => page.total) : Promise.resolve(null),
    [fetchPage, allowed],
  );
  const { state } = useApiQuery(fetcher);
  return {
    allowed,
    loading: state.status === 'loading',
    value: state.status === 'success' ? state.data : null,
    failed: state.status === 'error',
  };
}

export type TotalState = ReturnType<typeof useTotal>;
