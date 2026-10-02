import { useState, type ReactNode } from 'react';
import {
  changeMembershipStatus,
  listMemberships,
  listRoles,
} from '@inventario/api-client';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DataTable, type Column } from '../components/ui/DataTable';
import { ConfirmDialog } from '../components/ui/Dialog';
import { PageHeader } from '../components/ui/PageHeader';
import { RecordStatusBadge } from '../components/ui/RecordStatusBadge';
import {
  EmptyState,
  ErrorState,
  ForbiddenState,
} from '../components/ui/States';
import { useToast } from '../components/ui/toastContext';
import { apiErrorMessage, classifyApiError } from '../lib/apiError';
import type { MembershipView } from '../lib/apiTypes';
import { Permission } from '../lib/permissions';
import { ChangeRoleDialog } from '../features/users/ChangeRoleDialog';
import { CreateUserDialog } from '../features/users/CreateUserDialog';
import {
  membershipErrorMessage,
  membershipMessages,
} from '../features/users/userMessages';
import { useAuthenticatedSession, useSession } from '../session/sessionContext';
import { roleLabel } from '../session/types';
import { useApiQuery } from '../session/useApiQuery';

type Dialog =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'role'; membership: MembershipView }
  | { kind: 'deactivate'; membership: MembershipView };

/** Usuarios de la cuenta activa: listado, alta, cambio de rol y estado. */
export function UsersPage() {
  const { user } = useAuthenticatedSession();
  const { can, expireSession } = useSession();
  const { notify } = useToast();
  const memberships = useApiQuery(listMemberships);
  const roles = useApiQuery(listRoles);
  const [dialog, setDialog] = useState<Dialog>({ kind: 'none' });
  const [pendingId, setPendingId] = useState<string | null>(null);
  const canCreate = can(Permission.UsersCreate);
  const canManage = can(Permission.MembershipsManage);
  const roleOptions =
    roles.state.status === 'success' ? roles.state.data.roles : [];
  const close = () => setDialog({ kind: 'none' });

  const setStatus = async (
    membership: MembershipView,
    status: 'ACTIVE' | 'INACTIVE',
  ) => {
    setPendingId(membership.id);
    try {
      await changeMembershipStatus(membership.id, { status });
      notify(
        `${membership.user.name} ${status === 'ACTIVE' ? 'reactivado' : 'desactivado'} en esta cuenta.`,
      );
      memberships.reload();
    } catch (error) {
      const kind = classifyApiError(error);
      if (kind === 'unauthorized') return expireSession();
      notify(membershipErrorMessage(kind, membershipMessages), 'danger');
    } finally {
      setPendingId(null);
      close();
    }
  };

  const columns: Column<MembershipView>[] = [
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
              {m.user.id === user.id && (
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
      render: (m) => <RecordStatusBadge status={m.status} />,
    },
  ];

  if (canManage) {
    columns.push({
      key: 'actions',
      header: 'Acciones',
      align: 'end',
      // Sin acciones sobre la propia membresía: evita quitarse el acceso por error.
      render: (m) =>
        m.user.id === user.id ? (
          <span className="cell-muted">—</span>
        ) : (
          <span className="row-actions">
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Cambiar rol de ${m.user.name}`}
              disabled={pendingId === m.id || roleOptions.length === 0}
              onClick={() => setDialog({ kind: 'role', membership: m })}
            >
              Cambiar rol
            </Button>
            {m.status === 'ACTIVE' ? (
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Desactivar a ${m.user.name}`}
                disabled={pendingId === m.id}
                onClick={() => setDialog({ kind: 'deactivate', membership: m })}
              >
                Desactivar
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Activar a ${m.user.name}`}
                loading={pendingId === m.id}
                onClick={() => void setStatus(m, 'ACTIVE')}
              >
                Activar
              </Button>
            )}
          </span>
        ),
    });
  }

  const { state } = memberships;
  let content: ReactNode;
  if (state.status === 'error' && state.kind === 'forbidden') {
    content = <ForbiddenState />;
  } else if (state.status === 'error') {
    content = (
      <ErrorState
        icon={state.kind === 'unavailable' ? 'wifiOff' : 'alertTriangle'}
        description={apiErrorMessage(state.kind)}
        onRetry={memberships.reload}
      />
    );
  } else {
    content = (
      <DataTable
        caption="Usuarios de la cuenta"
        columns={columns}
        rows={state.status === 'success' ? state.data.memberships : []}
        getRowId={(m) => m.id}
        status={state.status === 'loading' ? 'loading' : 'ready'}
        empty={<EmptyState title="Esta cuenta aún no tiene usuarios" />}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Personas con acceso a la cuenta activa y sus roles."
        actions={
          canCreate && (
            <Button
              variant="primary"
              icon="plus"
              disabled={roleOptions.length === 0}
              onClick={() => setDialog({ kind: 'create' })}
            >
              Nuevo usuario
            </Button>
          )
        }
      />
      <Card flush>{content}</Card>

      {dialog.kind === 'create' && (
        <CreateUserDialog
          roles={roleOptions}
          onCancel={close}
          onCreated={() => {
            close();
            notify(
              'Usuario creado. Comparte la contraseña inicial de forma segura.',
            );
            memberships.reload();
          }}
        />
      )}
      {dialog.kind === 'role' && (
        <ChangeRoleDialog
          membership={dialog.membership}
          roles={roleOptions}
          onCancel={close}
          onChanged={(changed) => {
            close();
            if (!changed)
              return notify('No había cambios para guardar.', 'info');
            notify('Rol actualizado.');
            memberships.reload();
          }}
        />
      )}
      <ConfirmDialog
        open={dialog.kind === 'deactivate'}
        title="¿Desactivar usuario en esta cuenta?"
        description={
          dialog.kind === 'deactivate'
            ? `${dialog.membership.user.name} perderá el acceso a esta cuenta. Su usuario y sus otras cuentas no se modifican.`
            : ''
        }
        confirmLabel="Desactivar"
        tone="danger"
        loading={
          dialog.kind === 'deactivate' && pendingId === dialog.membership.id
        }
        onCancel={close}
        onConfirm={() => {
          if (dialog.kind === 'deactivate')
            void setStatus(dialog.membership, 'INACTIVE');
        }}
      />
    </>
  );
}
