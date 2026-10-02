import { listProducts, listWarehouses } from '@inventario/api-client';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { EmptyState } from '../components/ui/States';
import { useCatalogCount } from '../features/catalog/useCatalogCount';
import { ServiceStatusBadge } from '../features/health/ServiceStatusBadge';
import { useSystemHealth } from '../features/health/useSystemHealth';
import { Permission } from '../lib/permissions';
import { Link } from '../lib/router';
import {
  useActiveTenant,
  useAuthenticatedSession,
} from '../session/sessionContext';

const countFormat = new Intl.NumberFormat('es-CL');

function countHint(count: ReturnType<typeof useCatalogCount>, link: string) {
  if (!count.allowed) return 'Sin permiso de lectura';
  if (count.failed) return 'No disponible por ahora';
  return <Link to={link}>Ver listado</Link>;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? '';
}

export function DashboardPage() {
  const { user } = useAuthenticatedSession();
  const activeTenant = useActiveTenant();
  const health = useSystemHealth();
  const products = useCatalogCount(listProducts, Permission.ProductsRead);
  const warehouses = useCatalogCount(listWarehouses, Permission.WarehousesRead);

  return (
    <>
      <PageHeader
        title={`Hola, ${firstName(user.name)}`}
        description={`Resumen operativo de ${activeTenant.name}.`}
      />

      <div className="stack">
        {/* Conteos reales del catálogo; los indicadores de inventario (Fase 4) muestran "—". */}
        <div className="stat-grid">
          <StatCard
            label="Productos activos"
            value={
              products.value === null
                ? null
                : countFormat.format(products.value)
            }
            loading={products.loading}
            icon="box"
            hint={countHint(products, '/productos')}
          />
          <StatCard
            label="Bodegas activas"
            value={
              warehouses.value === null
                ? null
                : countFormat.format(warehouses.value)
            }
            loading={warehouses.loading}
            icon="warehouse"
            hint={countHint(warehouses, '/bodegas')}
          />
          <StatCard
            label="Bajo stock mínimo"
            value={null}
            icon="alertTriangle"
            hint="Disponible en Fase 4"
          />
          <StatCard
            label="Movimientos hoy"
            value={null}
            icon="movements"
            hint="Disponible en Fase 4"
          />
        </div>

        <div className="dashboard-grid">
          <Card
            title="Movimientos recientes"
            actions={<Link to="/movimientos">Ver todos</Link>}
          >
            <EmptyState
              compact
              icon="movements"
              title="Sin movimientos todavía"
              description="Aquí verás las últimas entradas, salidas y ajustes."
            />
          </Card>

          <div className="stack">
            <Card title="Alertas de stock">
              <EmptyState
                compact
                icon="checkCircle"
                title="Sin alertas"
                description="Se mostrarán productos bajo su stock mínimo."
              />
            </Card>
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
      </div>
    </>
  );
}
