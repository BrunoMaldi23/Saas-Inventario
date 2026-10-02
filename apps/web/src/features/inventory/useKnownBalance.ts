import { useCallback } from 'react';
import { listInventory } from '@inventario/api-client';
import { useApiQuery } from '../../session/useApiQuery';
import type { KnownBalance } from './inventoryLogic';

/**
 * Saldo real del par producto-bodega (GET /inventory filtrado). Sin fila de
 * balance el contrato lo trata como cero. null mientras falte algún dato.
 */
export function useKnownBalance(productId: string, warehouseId: string) {
  const fetcher = useCallback(
    (): Promise<KnownBalance> =>
      productId && warehouseId
        ? listInventory({ productId, warehouseId, page: 1, pageSize: 1 }).then(
            (page) => {
              const [row] = page.items;
              return row
                ? { exists: true, quantity: row.quantity }
                : { exists: false, quantity: '0' };
            },
          )
        : Promise.resolve(null),
    [productId, warehouseId],
  );
  const { state, reload } = useApiQuery(fetcher);
  return {
    balance: state.status === 'success' ? state.data : null,
    loading: state.status === 'loading' && Boolean(productId && warehouseId),
    reload,
  };
}
