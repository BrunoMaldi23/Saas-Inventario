import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Field, Input } from '../components/ui/Field';
import { PageHeader } from '../components/ui/PageHeader';
import { useAuthenticatedSession } from '../session/sessionContext';
import { roleLabel } from '../session/types';

const dateTimeFormat = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function ProfilePage() {
  const { user, tenants, activeTenant, expiresAt } = useAuthenticatedSession();

  return (
    <>
      <PageHeader
        title="Mi perfil"
        description="Tus datos personales y empresas a las que perteneces."
      />
      <div className="profile-grid">
        <Card>
          <div className="profile-summary">
            <Avatar name={user.name} size={56} />
            <div>
              <p className="profile-summary__name">{user.name}</p>
              <p className="cell-muted">{user.email}</p>
              <p className="cell-muted">
                Sesión válida hasta {dateTimeFormat.format(new Date(expiresAt))}
              </p>
            </div>
          </div>
        </Card>

        <Card
          title="Empresas"
          description="Tu rol se define por empresa."
          flush
        >
          <ul className="membership-list">
            {tenants.map((tenant) => (
              <li key={tenant.id}>
                <span className="cell-strong">{tenant.name}</span>
                <span className="membership-list__meta">
                  <Badge>{roleLabel(tenant.role)}</Badge>
                  {tenant.id === activeTenant?.id && (
                    <Badge tone="info" dot>
                      Activa
                    </Badge>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title="Permisos en la empresa activa"
          description="Definidos por tu rol. El servidor valida cada operación."
        >
          {activeTenant && activeTenant.permissions.length > 0 ? (
            <ul className="permission-list">
              {activeTenant.permissions.map((permission) => (
                <li key={permission}>
                  <code>{permission}</code>
                </li>
              ))}
            </ul>
          ) : (
            <p className="cell-muted">
              Tu rol no tiene permisos administrativos en esta empresa.
            </p>
          )}
        </Card>

        <Card
          title="Seguridad"
          description="El cambio de contraseña estará disponible próximamente."
        >
          <form
            className="form-grid"
            onSubmit={(event) => event.preventDefault()}
          >
            <Field label="Contraseña actual">
              {(props) => (
                <Input
                  {...props}
                  type="password"
                  autoComplete="current-password"
                  disabled
                />
              )}
            </Field>
            <Field label="Nueva contraseña" hint="Mínimo 8 caracteres.">
              {(props) => (
                <Input
                  {...props}
                  type="password"
                  autoComplete="new-password"
                  disabled
                />
              )}
            </Field>
            <div>
              <Button type="submit" disabled>
                Actualizar contraseña
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
