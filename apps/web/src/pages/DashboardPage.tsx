import { useCallback, type ReactNode } from 'react';
import {
  listInventory,
  listMovements,
  listProducts,
  listWarehouses,
} from '@inventario/api-client';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/States';
import { apiErrorMessage } from '../lib/apiError';
import { formatDecimal } from '../features/catalog/format';
import { useTotal, type TotalState } from '../features/dashboard/useTotal';
import { ServiceStatusBadge } from '../features/health/ServiceStatusBadge';
import { useSystemHealth } from '../features/health/useSystemHealth';
import {
  movementTypeLabels,
  todayRange,
} from '../features/inventory/inventoryLogic';
import { Permission } from '../lib/permissions';
import { Link } from '../lib/router';
import {
  useActiveTenant,
  useAuthenticatedSession,
  useSession,
} from '../session/sessionContext';
import { useApiQuery, type QueryState } from '../session/useApiQuery';

const countFormat = new Intl.NumberFormat('es-CL');
const timeFormat = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'short',
  timeStyle: 'short',
});

// Listados de 1 elemento: solo interesa el `total` real del servidor.
const countProducts = () => listProducts({ status: 'ACTIVE', pageSize: 1 });
const countWarehouses = () => listWarehouses({ status: 'ACTIVE', pageSize: 1 });
const countLowStock = () => listInventory({ lowStock: true, pageSize: 1 });
const recentMovements = () => listMovements({ page: 1, pageSize: 5 });
const lowStockSample = () =>
  listInventory({ lowStock: true, page: 1, pageSize: 5 });

function totalValue(total: TotalState) {
  return total.value === null ? null : countFormat.format(total.value);
}

function totalHint(total: TotalState, link: string, label = 'Ver listado') {
  if (!total.allowed) return 'Sin permiso de lectura';
  if (total.failed) return 'No disponible por ahora';
  return <Link to={link}>{label}</Link>;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? '';
}

/** Contenido de una tarjeta con datos remotos: carga, error, vacío o lista. */
function CardBody<T>({
  state,
  empty,
  render,
}: {
  state: QueryState<{ items: T[] }>;
  empty: ReactNode;
  render: (items: T[]) => ReactNode;
}) {
  if (state.status === 'loading') {
    return (
      <div className="stack">
        <Skeleton width="80%" />
        <Skeleton width="60%" />
        <Skeleton width="70%" />
      </div>
    );
  }
  if (state.status === 'error') {
    return <ErrorState description={apiErrorMessage(state.kind)} />;
  }
  return state.data.items.length === 0 ? empty : render(state.data.items);
}

function InventoryCards() {
  const recent = useApiQuery(recentMovements);
  const low = useApiQuery(lowStockSample);

  return (
    <>
      <Card
        title="Movimientos recientes"
        actions={<Link to="/movimientos">Ver todos</Link>}
      >
        <CardBody
          state={recent.state}
          empty={
            <EmptyState
              compact
              icon="movements"
              title="Sin movimientos todavía"
              description="Aquí verás las últimas entradas, salidas y ajustes."
            />
          }
          render={(items) => (
            <ul className="mini-list">
              {items.map((m) => (
                <li key={m.id}>
                  <span>
                    <span className="cell-strong">{m.product.name}</span>
                    <span className="cell-muted cell-block">
                      {movementTypeLabels[m.type]} ·{' '}
                      {timeFormat.format(new Date(m.createdAt))}
                    </span>
                  </span>
                  <span
                    className={
                      m.direction === 'IN' ? 'qty qty--in' : 'qty qty--out'
                    }
                  >
                    {m.direction === 'IN' ? '+' : '−'}
                    {formatDecimal(m.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        />
      </Card>
      <Card
        title="Bajo stock mínimo"
        actions={<Link to="/inventario">Ver inventario</Link>}
      >
        <CardBody
          state={low.state}
          empty={
            <EmptyState
              compact
              icon="checkCircle"
              title="Sin alertas"
              description="Ningún saldo está bajo su stock mínimo."
            />
          }
          render={(items) => (
            <ul className="mini-list">
              {items.map((b) => (
                <li key={b.id}>
                  <span>
                    <span className="cell-strong">{b.product.name}</span>
                    <span className="cell-muted cell-block">
                      {b.warehouse.name}
                    </span>
                  </span>
                  <span className="qty qty--out">
                    {formatDecimal(b.quantity)} /{' '}
                    {formatDecimal(b.product.minStock)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        />
      </Card>
    </>
  );
}

export function DashboardPage() {
  const { user } = useAuthenticatedSession();
  const activeTenant = useActiveTenant();
  const { can } = useSession();
  const health = useSystemHealth();
  const canReadInventory = can(Permission.InventoryRead);
  const countToday = useCallback(
    () => listMovements({ ...todayRange(), pageSize: 1 }),
    [],
  );
  const products = useTotal(countProducts, Permission.ProductsRead);
  const warehouses = useTotal(countWarehouses, Permission.WarehousesRead);
  const lowStock = useTotal(countLowStock, Permission.InventoryRead);
  const movementsToday = useTotal(countToday, Permission.InventoryRead);

  return (
    <>
      <PageHeader
        title={`Hola, ${firstName(user.name)}`}
        description={`Resumen operativo de ${activeTenant.name}.`}
      />

      <div className="stack">
        {/* Todas las cifras provienen del `total` real informado por la API. */}
        <div className="stat-grid">
          <StatCard
            label="Productos activos"
            value={totalValue(products)}
            loading={products.loading}
            icon="box"
            hint={totalHint(products, '/productos')}
          />
          <StatCard
            label="Bodegas activas"
            value={totalValue(warehouses)}
            loading={warehouses.loading}
            icon="warehouse"
            hint={totalHint(warehouses, '/bodegas')}
          />
          <StatCard
            label="Saldos bajo mínimo"
            value={totalValue(lowStock)}
            loading={lowStock.loading}
            icon="alertTriangle"
            hint={totalHint(lowStock, '/inventario', 'Ver inventario')}
          />
          <StatCard
            label="Movimientos hoy"
            value={totalValue(movementsToday)}
            loading={movementsToday.loading}
            icon="movements"
            hint={totalHint(movementsToday, '/movimientos', 'Ver movimientos')}
          />
        </div>

        <div className="dashboard-grid">
          <div className="stack">
            {canReadInventory ? (
              <InventoryCards />
            ) : (
              <Card title="Inventario">
                <EmptyState
                  compact
                  icon="lock"
                  title="Sin acceso a inventario"
                  description="Tu rol no permite consultar saldos ni movimientos."
                />
              </Card>
            )}
          </div>

          <Card
            title="Estado del sistema"
            actions={
              <Button size="sm" icon="refresh" onClick={health.refresh}>
                Verificar
              </Button>
            }
          >
            <dl className="kv-list">
              <div>
                <dt>API</dt>
                <dd>
                  <ServiceStatusBadge status={health.api} />
                </dd>
              </div>
              <div>
                <dt>Base de datos</dt>
                <dd>
                  <ServiceStatusBadge status={health.database} />
                </dd>
              </div>
            </dl>
            <p className="card-footnote">
              <Link to="/sistema">Ver detalle técnico</Link>
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
