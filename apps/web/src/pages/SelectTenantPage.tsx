import { useState } from 'react';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState, Notice } from '../components/ui/States';
import { navigate } from '../lib/router';
import {
  useAuthenticatedSession,
  useSession,
} from '../session/SessionProvider';
import { roleLabel } from '../session/types';

export function SelectTenantPage() {
  const session = useAuthenticatedSession();
  const { switchTenant, logout } = useSession();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const select = async (tenantId: string) => {
    setPendingId(tenantId);
    setError(null);
    try {
      await switchTenant(tenantId);
      navigate('/', { replace: true });
    } catch {
      setError('No pudimos abrir esa empresa. Inténtalo nuevamente.');
      setPendingId(null);
    }
  };

  return (
    <AuthLayout
      title="Elige una empresa"
      description={`Hola ${session.user.name}, selecciona con qué empresa quieres trabajar.`}
    >
      <div className="form-grid">
        {error && <Notice tone="danger">{error}</Notice>}
        {session.memberships.length === 0 ? (
          <EmptyState
            compact
            icon="building"
            title="No perteneces a ninguna empresa"
            description="Pide a un administrador que te invite."
          />
        ) : (
          <ul className="tenant-options">
            {session.memberships.map((m) => (
              <li key={m.tenantId}>
                <button
                  type="button"
                  className="tenant-option"
                  disabled={pendingId !== null}
                  onClick={() => void select(m.tenantId)}
                >
                  <span className="tenant-switcher__icon" aria-hidden="true">
                    <Icon name="building" size={18} />
                  </span>
                  <span className="tenant-option__text">
                    <span className="cell-strong">{m.tenantName}</span>
                    <span className="cell-muted">{roleLabel(m.roleName)}</span>
                  </span>
                  {pendingId === m.tenantId ? (
                    <Spinner size={18} />
                  ) : (
                    <Icon
                      name="chevronDown"
                      size={18}
                      className="tenant-option__arrow"
                    />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
        <Button variant="ghost" icon="logout" onClick={() => void logout()}>
          Usar otra cuenta
        </Button>
      </div>
    </AuthLayout>
  );
}
