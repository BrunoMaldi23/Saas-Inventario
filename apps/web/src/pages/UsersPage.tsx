import { listMemberships } from '@inventario/api-client';
import type { MembershipView } from '../lib/apiTypes';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DataTable, type Column } from '../components/ui/DataTable';
import { PageHeader } from '../components/ui/PageHeader';
import {
  EmptyState,
  ErrorState,
  ForbiddenState,
  Notice,
} from '../components/ui/States';
import { apiErrorMessage } from '../lib/apiError';
import { Permission } from '../lib/permissions';
import {
  useAuthenticatedSession,
  useSession,
} from '../session/SessionProvider';
import { roleLabel } from '../session/types';
import { useApiQuery } from '../session/useApiQuery';

function buildColumns(currentUserId: string): Column<MembershipView>[] {
  return [
    {
      key: 'user',
      header: 'Usuario',
      primary: true,
      render: (m) => (
        <span className="user-cell">
          <Avatar name={m.user.name} size={28} />
          <span>
            <span className="cell-strong">
              {m.user.name}
              {m.user.id === currentUserId && (
                <span className="cell-muted"> (tú)</span>
              )}
            </span>
            <span className="cell-muted cell-block">{m.user.email}</span>
          </span>
        </span>
      ),
    },
    { key: 'role', header: 'Rol', render: (m) => roleLabel(m.role.name) },
    {
      key: 'status',
      header: 'Estado',
      render: (m) =>
        m.status === 'ACTIVE' ? (
          <Badge tone="success" dot>
            Activo
          </Badge>
        ) : (
          <Badge dot>Inactivo</Badge>
        ),
    },
  ];
}

/** Usuarios del tenant activo en modo lectura (GET /memberships). */
export function UsersPage() {
  const { user } = useAuthenticatedSession();
  const { can } = useSession();
  const { state, reload } = useApiQuery(listMemberships);

  let content;
  if (state.status === 'error' && state.kind === 'forbidden') {
    content = <ForbiddenState />;
  } else if (state.status === 'error') {
    content = (
      <ErrorState
        icon={state.kind === 'unavailable' ? 'wifiOff' : 'alertTriangle'}
        description={apiErrorMessage(state.kind)}
        onRetry={reload}
      />
    );
  } else {
    content = (
      <DataTable
        caption="Usuarios de la empresa"
        columns={buildColumns(user.id)}
        rows={state.status === 'success' ? state.data.memberships : []}
        getRowId={(m) => m.id}
        status={state.status === 'loading' ? 'loading' : 'ready'}
        empty={<EmptyState title="Esta empresa aún no tiene usuarios" />}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Personas con acceso a la empresa activa y sus roles."
        actions={
          can(Permission.UsersCreate) && (
            <Button
              variant="primary"
              icon="plus"
              disabled
              title="Disponible próximamente"
            >
              Nuevo usuario
            </Button>
          )
        }
      />
      <div className="stack">
        <Notice tone="info">
          Vista de solo lectura. La creación de usuarios y el cambio de roles se
          habilitarán en una próxima iteración.
        </Notice>
        <Card flush>{content}</Card>
      </div>
    </>
  );
}
