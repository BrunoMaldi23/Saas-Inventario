import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Field, Input } from '../components/ui/Field';
import { PageHeader } from '../components/ui/PageHeader';
import { useAuthenticatedSession } from '../session/SessionProvider';
import { roleLabel } from '../session/types';

export function ProfilePage() {
  const session = useAuthenticatedSession();
  const { user } = session;

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
            </div>
          </div>
        </Card>

        <Card
          title="Empresas"
          description="Tu rol se define por empresa."
          flush
        >
          <ul className="membership-list">
            {session.memberships.map((m) => (
              <li key={m.tenantId}>
                <span className="cell-strong">{m.tenantName}</span>
                <span className="membership-list__meta">
                  <Badge>{roleLabel(m.roleName)}</Badge>
                  {m.tenantId === session.activeTenantId && (
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
