import { useCallback, useState } from 'react';
import { getDashboardReport } from '@inventario/api-client';
import type { DashboardReport } from '@inventario/types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Field';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import {
  EmptyState,
  ErrorState,
  ForbiddenState,
} from '../components/ui/States';
import { apiErrorMessage } from '../lib/apiError';
import { formatDecimal } from '../features/catalog/format';
import { ServiceStatusBadge } from '../features/health/ServiceStatusBadge';
import { useSystemHealth } from '../features/health/useSystemHealth';
import { movementTypeLabels } from '../features/inventory/inventoryLogic';
import { formatUtc } from '../features/reports/formatUtc';
import {
  buildRange,
  dashboardStats,
  periodLabels,
  rangeQuery,
} from '../features/reports/reportLogic';
import { UnitTotals } from '../features/reports/UnitTotals';
import { Permission } from '../lib/permissions';
import { Link } from '../lib/router';
import {
  useActiveTenant,
  useAuthenticatedSession,
  useSession,
} from '../session/sessionContext';
import { useApiQuery } from '../session/useApiQuery';
import type { IconName } from '../components/ui/Icon';

const countFormat = new Intl.NumberFormat('es-CL');

type DashboardPeriod = 'today' | 'last7' | 'last30';

const statIcons: Record<string, IconName> = {
  products: 'box',
  warehouses: 'warehouse',
  lowStock: 'alertTriangle',
  today: 'movements',
};

const statLinks: Record<string, string> = {
  products: '/productos',
  warehouses: '/bodegas',
  lowStock: '/reportes',
  today: '/movimientos',
};

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? '';
}

function SystemHealthCard() {
  const health = useSystemHealth();
  return (
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
  );
}

function ReportContent({
  report,
  period,
  onPeriodChange,
}: {
  report: DashboardReport;
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
}) {
  const { user } = useAuthenticatedSession();
  return (
    <>
      <div className="stat-grid">
        {dashboardStats(report).map((stat) => (
          <StatCard
            key={stat.key}
            label={stat.label}
            value={countFormat.format(stat.value)}
            icon={statIcons[stat.key] ?? 'chart'}
            hint={
              stat.hint ?? (
                <Link to={statLinks[stat.key] ?? '/reportes'}>Ver detalle</Link>
              )
            }
          />
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="stack">
          <Card
            title="Entradas y salidas"
            description={`Del ${formatUtc(report.periodRange.from)} al ${formatUtc(report.periodRange.to)}. Cada unidad de medida se informa por separado.`}
            actions={
              <Select
                aria-label="Período"
                value={period}
                onChange={(e) =>
                  onPeriodChange(e.target.value as DashboardPeriod)
                }
              >
                {(['today', 'last7', 'last30'] as const).map((p) => (
                  <option key={p} value={p}>
                    {periodLabels[p]}
                  </option>
                ))}
              </Select>
            }
          >
            <UnitTotals totals={report.periodTotalsByUnit} />
          </Card>

          <Card
            title="Movimientos recientes"
            actions={<Link to="/movimientos">Ver todos</Link>}
          >
            {report.recentMovements.length === 0 ? (
              <EmptyState
                compact
                icon="movements"
                title="Sin movimientos todavía"
                description="Aquí verás las últimas entradas, salidas y ajustes."
              />
            ) : (
              <ul className="mini-list">
                {report.recentMovements.map((m) => (
                  <li key={m.id}>
                    <span>
                      <span className="cell-strong">{m.product.name}</span>
                      <span className="cell-muted cell-block">
                        {movementTypeLabels[m.type]} · {m.warehouse.name} ·{' '}
                        {m.actor.id === user.id ? 'Tú' : m.actor.name} ·{' '}
                        {formatUtc(m.createdAt)}
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
          </Card>
        </div>

        <div className="stack">
          <Card
            title="Productos bajo stock mínimo"
            description={
              report.lowStockProductCount > report.lowStockProducts.length
                ? `Se muestran ${report.lowStockProducts.length} de ${report.lowStockProductCount}.`
                : undefined
            }
            actions={<Link to="/reportes">Ver reporte</Link>}
          >
            {report.lowStockProducts.length === 0 ? (
              <EmptyState
                compact
                icon="checkCircle"
                title="No hay productos bajo stock mínimo."
              />
            ) : (
              <ul className="mini-list">
                {report.lowStockProducts.map((item) => (
                  <li key={item.product.id}>
                    <span>
                      <span className="cell-strong">{item.product.name}</span>
                      <span className="cell-muted cell-block">
                        {item.locations
                          .map(
                            (l) =>
                              `${l.warehouse.name}: ${formatDecimal(l.quantity)} / ${formatDecimal(l.minStock)}`,
                          )
                          .join(' · ')}
                      </span>
                    </span>
                    <span className="cell-muted">
                      {item.product.unitOfMeasure}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <SystemHealthCard />
        </div>
      </div>
    </>
  );
}

/** Dashboard basado en GET /reports/dashboard (una sola consulta). */
export function DashboardPage() {
  const { user } = useAuthenticatedSession();
  const activeTenant = useActiveTenant();
  const { can } = useSession();
  const canRead = can(Permission.ReportsRead);
  const [period, setPeriod] = useState<DashboardPeriod>('today');

  const fetcher = useCallback(() => {
    if (!canRead) return Promise.resolve(null);
    // "Hoy" lo define el servidor (día UTC): no se envía rango.
    if (period === 'today') return getDashboardReport();
    const result = buildRange(period, { from: '', to: '' });
    return getDashboardReport(result.ok ? rangeQuery(result.range) : {});
  }, [canRead, period]);
  const { state, reload } = useApiQuery(fetcher);

  return (
    <>
      <PageHeader
        title={`Hola, ${firstName(user.name)}`}
        description={
          state.status === 'success' && state.data
            ? `Resumen de ${activeTenant.name} · actualizado ${formatUtc(state.data.generatedAt)}.`
            : `Resumen de ${activeTenant.name}.`
        }
      />
      <div className="stack">
        {!canRead ? (
          <Card>
            <EmptyState
              compact
              icon="lock"
              title="Sin acceso a reportes"
              description="Tu rol no incluye el permiso para ver indicadores."
            />
          </Card>
        ) : state.status === 'loading' ? (
          <div className="stat-grid">
            {['a', 'b', 'c', 'd'].map((key) => (
              <StatCard
                key={key}
                label="Cargando…"
                value={null}
                icon="chart"
                loading
              />
            ))}
          </div>
        ) : state.status === 'error' ? (
          <Card>
            {state.kind === 'forbidden' ? (
              <ForbiddenState />
            ) : (
              <ErrorState
                icon={
                  state.kind === 'unavailable' ? 'wifiOff' : 'alertTriangle'
                }
                title="No pudimos cargar el resumen"
                description={apiErrorMessage(state.kind)}
                onRetry={reload}
              />
            )}
          </Card>
        ) : state.data ? (
          <ReportContent
            report={state.data}
            period={period}
            onPeriodChange={setPeriod}
          />
        ) : null}
        {(!canRead || state.status !== 'success') && <SystemHealthCard />}
      </div>
    </>
  );
}
