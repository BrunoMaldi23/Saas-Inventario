import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { EmptyState } from '../components/ui/States';
import { ServiceStatusBadge } from '../features/health/ServiceStatusBadge';
import { useSystemHealth } from '../features/health/useSystemHealth';
import { Link } from '../lib/router';
import {
  useActiveTenant,
  useAuthenticatedSession,
} from '../session/SessionProvider';

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? '';
}

export function DashboardPage() {
  const { user } = useAuthenticatedSession();
  const activeTenant = useActiveTenant();
  const health = useSystemHealth();

  return (
    <>
      <PageHeader
        title={`Hola, ${firstName(user.name)}`}
        description={`Resumen operativo de ${activeTenant.name}.`}
      />

      <div className="stack">
        {/* Sin API de inventario aún: los indicadores muestran "—", nunca cifras inventadas. */}
        <div className="stat-grid">
          <StatCard
            label="Productos activos"
            value={null}
            icon="box"
            hint="Disponible en Fase 3"
          />
          <StatCard
            label="Bodegas"
            value={null}
            icon="warehouse"
            hint="Disponible en Fase 3"
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
