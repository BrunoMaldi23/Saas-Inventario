import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DataTable, type Column } from '../components/ui/DataTable';
import { ModuleNotice } from '../components/ui/ModuleNotice';
import { PageHeader } from '../components/ui/PageHeader';
import {
  useAuthenticatedSession,
  useSession,
} from '../session/SessionProvider';
import { roleLabel } from '../session/types';

type UserRow = {
  id: string;
  name: string;
  email: string;
  roleName: string;
  isSelf: boolean;
};

const columns: Column<UserRow>[] = [
  {
    key: 'user',
    header: 'Usuario',
    primary: true,
    render: (u) => (
      <span className="user-cell">
        <Avatar name={u.name} size={28} />
        <span>
          <span className="cell-strong">
            {u.name}
            {u.isSelf && <span className="cell-muted"> (tú)</span>}
          </span>
          <span className="cell-muted cell-block">{u.email}</span>
        </span>
      </span>
    ),
  },
  { key: 'role', header: 'Rol', render: (u) => roleLabel(u.roleName) },
  {
    key: 'status',
    header: 'Estado',
    render: () => (
      <Badge tone="success" dot>
        Activo
      </Badge>
    ),
  },
];

export function UsersPage() {
  const { user } = useAuthenticatedSession();
  const { activeMembership } = useSession();

  // Solo se lista al usuario de la sesión: el listado real requiere API (Fase 2).
  const rows: UserRow[] = activeMembership
    ? [{ ...user, roleName: activeMembership.roleName, isSelf: true }]
    : [];

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Personas con acceso a la empresa activa y sus roles."
        actions={
          <Button
            variant="primary"
            icon="plus"
            disabled
            title="Disponible cuando exista la API"
          >
            Invitar usuario
          </Button>
        }
      />
      <div className="stack">
        <ModuleNotice phase={2}>
          La administración de usuarios e invitaciones se habilitará junto con
          autenticación y multi-tenancy. Por ahora solo se muestra tu usuario.
        </ModuleNotice>
        <Card flush>
          <DataTable
            caption="Usuarios de la empresa"
            columns={columns}
            rows={rows}
            getRowId={(u) => u.id}
          />
        </Card>
      </div>
    </>
  );
}
