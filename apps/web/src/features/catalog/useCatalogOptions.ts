import { useCallback, useMemo } from 'react';
import type {
  CatalogPage,
  CatalogQuery,
  RecordStatus,
} from '../../lib/apiTypes';
import { useSession } from '../../session/sessionContext';
import { useApiQuery } from '../../session/useApiQuery';

/** Máximo permitido por el contrato para pageSize. */
export const OPTIONS_LIMIT = 100;

type Option = { id: string; name: string; status: RecordStatus };

/**
 * Registros de otro recurso para selects y para mostrar nombres en tablas
 * (p. ej. la categoría de un producto). Trae una sola página de hasta 100
 * registros, activos e inactivos; sin permiso de lectura no consulta.
 */
export function useCatalogOptions<T extends Option>(
  list: (query: CatalogQuery) => Promise<CatalogPage<T>>,
  permission: string,
) {
  const { can } = useSession();
  const allowed = can(permission);
  const fetcher = useCallback(
    () =>
      allowed
        ? list({ page: 1, pageSize: OPTIONS_LIMIT })
        : Promise.resolve<CatalogPage<T>>({
            items: [],
            page: 1,
            pageSize: OPTIONS_LIMIT,
            total: 0,
          }),
    [list, allowed],
  );
  const { state, reload } = useApiQuery(fetcher);
  const items = useMemo(
    () => (state.status === 'success' ? state.data.items : []),
    [state],
  );
  const byId = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );

  return {
    items,
    /** Opciones elegibles: activas, más la seleccionada actual si está inactiva. */
    selectable: (currentId?: string | null) =>
      items.filter((i) => i.status === 'ACTIVE' || i.id === currentId),
    nameOf: (id: string | null) => (id ? byId.get(id)?.name : undefined),
    loading: state.status === 'loading',
    failed: state.status === 'error',
    /** true si hay más registros de los que se cargaron. */
    truncated: state.status === 'success' && state.data.total > items.length,
    allowed,
    reload,
  };
}
