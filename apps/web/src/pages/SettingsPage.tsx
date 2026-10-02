import { Card } from '../components/ui/Card';
import { Field, Input } from '../components/ui/Field';
import { Icon } from '../components/ui/Icon';
import { ModuleNotice } from '../components/ui/ModuleNotice';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/States';
import { Link } from '../lib/router';
import { useSession } from '../session/SessionProvider';

export function SettingsPage() {
  const { activeMembership } = useSession();

  return (
    <>
      <PageHeader
        title="Configuración"
        description="Datos de la empresa, sucursales y preferencias del tenant."
      />
      <div className="stack">
        <ModuleNotice phase={3} />

        <Card
          title="Empresa"
          description="Datos comerciales visibles en reportes."
        >
          <div className="form-grid">
            <Field label="Nombre de la empresa">
              {(props) => (
                <Input
                  {...props}
                  value={activeMembership?.tenantName ?? ''}
                  readOnly
                />
              )}
            </Field>
            <div className="form-row">
              <Field label="Identificación tributaria">
                {(props) => <Input {...props} disabled />}
              </Field>
              <Field label="Rubro">
                {(props) => <Input {...props} disabled />}
              </Field>
            </div>
          </div>
        </Card>

        <Card title="Sucursales">
          <EmptyState
            compact
            icon="building"
            title="Sin sucursales configuradas"
            description="Las sucursales agrupan bodegas y usuarios por punto de operación."
          />
        </Card>

        <Card title="Herramientas técnicas">
          <ul className="link-list">
            <li>
              <Link to="/sistema">
                <Icon name="activity" size={16} /> Estado del sistema
              </Link>
            </li>
            {import.meta.env.DEV && (
              <li>
                <Link to="/sistema/componentes">
                  <Icon name="dashboard" size={16} /> Catálogo de componentes
                  (solo desarrollo)
                </Link>
              </li>
            )}
          </ul>
        </Card>
      </div>
    </>
  );
}
