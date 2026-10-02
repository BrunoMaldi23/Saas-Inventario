import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Icon, type IconName } from '../../components/ui/Icon';
import { PageHeader } from '../../components/ui/PageHeader';
import { Notice } from '../../components/ui/States';
import { ServiceStatusBadge } from './ServiceStatusBadge';
import { useSystemHealth, type ServiceStatus } from './useSystemHealth';

type ServiceRowProps = {
  icon: IconName;
  name: string;
  endpoint: string;
  status: ServiceStatus;
};

function ServiceRow({ icon, name, endpoint, status }: ServiceRowProps) {
  return (
    <li className="service-row">
      <span className="service-row__icon">
        <Icon name={icon} size={18} />
      </span>
      <div className="service-row__text">
        <p className="service-row__name">{name}</p>
        <code className="service-row__endpoint">{endpoint}</code>
      </div>
      <ServiceStatusBadge status={status} />
    </li>
  );
}

const timeFormat = new Intl.DateTimeFormat('es-CL', { timeStyle: 'medium' });

/** Pantalla técnica de conectividad Frontend → API → Database. */
export function HealthPage() {
  const { api, database, checkedAt, refresh } = useSystemHealth();
  const checking = api === 'checking' || database === 'checking';
  const allOnline = api === 'online' && database === 'online';

  return (
    <>
      <PageHeader
        title="Estado del sistema"
        description="Verificación técnica de conectividad entre la aplicación web, la API y la base de datos."
        actions={
          <Button icon="refresh" onClick={refresh} loading={checking}>
            Verificar de nuevo
          </Button>
        }
      />

      <div className="stack">
        {!checking &&
          (allOnline ? (
            <Notice tone="success" title="Todos los servicios responden">
              La aplicación puede comunicarse con la API y la base de datos.
            </Notice>
          ) : (
            <Notice tone="danger" title="Hay servicios sin conexión">
              Revisa que la API esté en ejecución y que PostgreSQL esté
              disponible (ver README del repositorio).
            </Notice>
          ))}

        <Card
          title="Servicios"
          description={
            checkedAt
              ? `Última verificación: ${timeFormat.format(checkedAt)}`
              : 'Verificando…'
          }
          flush
        >
          <ul className="service-list">
            <ServiceRow
              icon="activity"
              name="API"
              endpoint="GET /api/v1/health"
              status={api}
            />
            <ServiceRow
              icon="layers"
              name="Base de datos"
              endpoint="GET /api/v1/health/database"
              status={database}
            />
          </ul>
        </Card>
      </div>
    </>
  );
}
