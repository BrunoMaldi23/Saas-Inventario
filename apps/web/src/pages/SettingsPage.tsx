import { Card } from '../components/ui/Card';
import { Icon, type IconName } from '../components/ui/Icon';
import { PageHeader } from '../components/ui/PageHeader';
import { Permission } from '../lib/permissions';
import { Link } from '../lib/router';
import { useActiveTenant, useSession } from '../session/sessionContext';
import { roleLabel } from '../session/types';

type SettingsLink = {
  to: string;
  icon: IconName;
  label: string;
  description: string;
  permission?: string;
};

const organizationLinks: SettingsLink[] = [
  {
    to: '/empresas',
    icon: 'building',
    label: 'Empresas',
    description: 'Razones sociales, identificación tributaria y rubro.',
    permission: Permission.CompaniesRead,
  },
  {
    to: '/sucursales',
    icon: 'mapPin',
    label: 'Sucursales',
    description: 'Puntos de operación de cada empresa.',
    permission: Permission.BranchesRead,
  },
  {
    to: '/usuarios',
    icon: 'users',
    label: 'Usuarios',
    description: 'Personas con acceso a esta cuenta y sus roles.',
    permission: Permission.UsersRead,
  },
];

export function SettingsPage() {
  const activeTenant = useActiveTenant();
  const { can } = useSession();
  const links = organizationLinks.filter((link) => can(link.permission));

  return (
    <>
      <PageHeader
        title="Configuración"
        description="Cuenta activa, organización y herramientas técnicas."
      />
      <div className="stack">
        {/* Tenant = cuenta SaaS; Company = empresa comercial dentro de la cuenta. */}
        <Card
          title="Cuenta"
          description="Espacio de trabajo en InventarioSaaS. Aísla usuarios y datos de otras cuentas."
        >
          <dl className="kv-list">
            <div>
              <dt>Nombre de la cuenta</dt>
              <dd className="cell-strong">{activeTenant.name}</dd>
            </div>
            <div>
              <dt>Tu rol</dt>
              <dd>{roleLabel(activeTenant.role)}</dd>
            </div>
          </dl>
        </Card>

        {links.length > 0 && (
          <Card
            title="Organización"
            description="Empresas comerciales y puntos de operación dentro de esta cuenta."
          >
            <ul className="settings-links">
              {links.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="settings-link">
                    <span className="settings-link__icon" aria-hidden="true">
                      <Icon name={link.icon} size={18} />
                    </span>
                    <span>
                      <span className="settings-link__label">{link.label}</span>
                      <span className="settings-link__description">
                        {link.description}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}

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
