import { useState } from 'react';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState, Notice } from '../components/ui/States';
import { apiErrorMessage, classifyApiError } from '../lib/apiError';
import { navigate } from '../lib/router';
import {
  useAuthenticatedSession,
  useSession,
} from '../session/SessionProvider';
import { roleLabel } from '../session/types';

export function SelectTenantPage() {
  const { user, tenants } = useAuthenticatedSession();
  const { switchTenant, logout } = useSession();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const select = async (tenantId: string) => {
    setPendingId(tenantId);
    setError(null);
    try {
      await switchTenant(tenantId);
      navigate('/', { replace: true });
    } catch (cause) {
      const kind = classifyApiError(cause);
      // Con 401 el provider ya volvió al login.
      if (kind === 'unauthorized') return;
      setError(
        kind === 'not-found'
          ? 'Esa empresa ya no está disponible para tu usuario.'
          : apiErrorMessage(kind),
      );
      setPendingId(null);
    }
  };

  const signOut = async () => {
    setLoggingOut(true);
    setError(null);
    try {
      await logout();
    } catch (cause) {
      setError(apiErrorMessage(classifyApiError(cause)));
      setLoggingOut(false);
    }
  };

  return (
    <AuthLayout
      title="Elige una empresa"
      description={`Hola ${user.name}, selecciona con qué empresa quieres trabajar.`}
    >
      <div className="form-grid">
        {error && <Notice tone="danger">{error}</Notice>}
        {tenants.length === 0 ? (
          <EmptyState
            compact
            icon="building"
            title="No tienes empresas activas"
            description="Tu usuario no tiene una membresía activa. Pide a un administrador que te agregue a una empresa."
          />
        ) : (
          <ul className="tenant-options">
            {tenants.map((tenant) => (
              <li key={tenant.id}>
                <button
                  type="button"
                  className="tenant-option"
                  disabled={pendingId !== null || loggingOut}
                  onClick={() => void select(tenant.id)}
                >
                  <span className="tenant-switcher__icon" aria-hidden="true">
                    <Icon name="building" size={18} />
                  </span>
                  <span className="tenant-option__text">
                    <span className="cell-strong">{tenant.name}</span>
                    <span className="cell-muted">{roleLabel(tenant.role)}</span>
                  </span>
                  {pendingId === tenant.id ? (
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
        <Button
          variant="ghost"
          icon="logout"
          loading={loggingOut}
          disabled={pendingId !== null}
          onClick={() => void signOut()}
        >
          Usar otra cuenta
        </Button>
      </div>
    </AuthLayout>
  );
}
