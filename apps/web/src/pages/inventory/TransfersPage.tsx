import { useCallback, useState } from 'react';
import { getTransfer, listTransfers } from '@inventario/api-client';
import type { StockTransferView } from '@inventario/types';
import { PagedTable } from '../../components/data/PagedTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import type { Column } from '../../components/ui/DataTable';
import { Dialog } from '../../components/ui/Dialog';
import { PageHeader } from '../../components/ui/PageHeader';
import {
  EmptyState,
  ErrorState,
  ForbiddenState,
  LoadingState,
} from '../../components/ui/States';
import { useToast } from '../../components/ui/toastContext';
import { apiErrorMessage } from '../../lib/apiError';
import { Permission } from '../../lib/permissions';
import { formatDecimal } from '../../features/catalog/format';
import { ProductPicker } from '../../features/inventory/ProductPicker';
import { StockOperationDialog } from '../../features/inventory/StockOperationDialog';
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

/** Detalle consultado con GET /transfers/:id. */
function TransferDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { user } = useAuthenticatedSession();
  const fetcher = useCallback(() => getTransfer(id), [id]);
  const { state, reload } = useApiQuery(fetcher);

  return (
    <Dialog open onClose={onClose} title="Detalle de transferencia">
      {state.status === 'loading' ? (
        <LoadingState />
      ) : state.status === 'error' ? (
        state.kind === 'forbidden' ? (
          <ForbiddenState />
        ) : (
          <ErrorState
            title={
              state.kind === 'not-found'
                ? 'Transferencia no encontrada'
                : undefined
            }
            description={apiErrorMessage(state.kind)}
            onRetry={reload}
          />
        )
      ) : (
        <dl className="kv-list">
          <div>
            <dt>Producto</dt>
            <dd className="cell-strong">{state.data.product.name}</dd>
          </div>
          <div>
            <dt>Origen</dt>
            <dd>{state.data.fromWarehouse.name}</dd>
          </div>
          <div>
            <dt>Destino</dt>
            <dd>{state.data.toWarehouse.name}</dd>
          </div>
          <div>
            <dt>Cantidad</dt>
            <dd>{formatDecimal(state.data.quantity)}</dd>
          </div>
          <div>
            <dt>Estado</dt>
            <dd>
              <Badge tone="success" dot>
                Completada
              </Badge>
            </dd>
          </div>
          <div>
            <dt>Completada</dt>
            <dd>{dateTime.format(new Date(state.data.completedAt))}</dd>
          </div>
          <div>
            <dt>Registrada por</dt>
            <dd>
              {state.data.actor.id === user.id ? 'Tú' : state.data.actor.name}
            </dd>
          </div>
          <div>
            <dt>Motivo</dt>
            <dd>{state.data.reason ?? '—'}</dd>
          </div>
          <div>
            <dt>Identificador</dt>
            <dd>
              <code>{state.data.id}</code>
            </dd>
          </div>
        </dl>
      )}
    </Dialog>
  );
}

export function TransfersPage() {
  const { user } = useAuthenticatedSession();
  const { can } = useSession();
  const { notify } = useToast();
  const canTransfer = can(Permission.InventoryTransfer);
  const [productId, setProductId] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const fetcher = useCallback(
    () =>
      listTransfers({
        page,
        pageSize: PAGE_SIZE,
        productId: productId || undefined,
      }),
    [page, productId],
  );
  const { state, reload } = useApiQuery(fetcher);

  const columns: Column<StockTransferView>[] = [
    {
      key: 'date',
      header: 'Fecha',
      render: (t) => dateTime.format(new Date(t.createdAt)),
    },
    {
      key: 'product',
      header: 'Producto',
      primary: true,
      render: (t) => <span className="cell-strong">{t.product.name}</span>,
    },
    {
      key: 'route',
      header: 'Origen → destino',
      render: (t) => `${t.fromWarehouse.name} → ${t.toWarehouse.name}`,
    },
    {
      key: 'quantity',
      header: 'Cantidad',
      align: 'end',
      render: (t) => formatDecimal(t.quantity),
    },
    {
      key: 'reason',
      header: 'Motivo',
      hideOnMobile: true,
      render: (t) => t.reason ?? '—',
    },
    {
      key: 'actor',
      header: 'Usuario',
      hideOnMobile: true,
      render: (t) => (t.actor.id === user.id ? 'Tú' : t.actor.name),
    },
    {
      key: 'status',
      header: 'Estado',
      render: () => (
        <Badge tone="success" dot>
          Completada
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      align: 'end',
      render: (t) => (
        <span className="row-actions">
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Ver detalle de transferencia de ${t.product.name}`}
            onClick={() => setDetailId(t.id)}
          >
            Ver detalle
          </Button>
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Transferencias"
        description="Traspasos de un producto entre bodegas de la cuenta. Cada transferencia se completa de inmediato."
        actions={
          canTransfer && (
            <Button
              variant="primary"
              icon="swap"
              onClick={() => setCreating(true)}
            >
              Nueva transferencia
            </Button>
          )
        }
      />
      <Card flush>
        <div className="filters-grid" role="search" aria-label="Filtros">
          <ProductPicker
            label="Producto"
            value={productId}
            emptyLabel="Todos los productos"
            onChange={(product) => {
              setProductId(product?.id ?? '');
              setPage(1);
            }}
          />
        </div>
        <PagedTable
          state={state}
          caption="Transferencias"
          columns={columns}
          getRowId={(t) => t.id}
          onRetry={reload}
          onPageChange={setPage}
          empty={
            <EmptyState
              icon="swap"
              title={productId ? 'Sin resultados' : 'Aún no hay transferencias'}
              description={
                productId
                  ? 'Este producto no tiene transferencias.'
                  : 'Las transferencias entre bodegas aparecerán aquí.'
              }
            />
          }
        />
      </Card>

      {creating && (
        <StockOperationDialog
          operation="transfer"
          onCancel={() => setCreating(false)}
          onDone={(message) => {
            setCreating(false);
            notify(message);
            reload();
          }}
        />
      )}
      {detailId && (
        <TransferDetail id={detailId} onClose={() => setDetailId(null)} />
      )}
    </>
  );
}
