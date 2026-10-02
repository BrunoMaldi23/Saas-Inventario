import { useCallback, useId, useRef, useState } from 'react';
import { apiErrorMessage, classifyApiError } from '../../lib/apiError';
import { cx } from '../../lib/cx';
import { navigate } from '../../lib/router';
import { useDismiss } from '../../lib/useDismiss';
import {
  useActiveTenant,
  useAuthenticatedSession,
  useSession,
} from '../../session/SessionProvider';
import { roleLabel } from '../../session/types';
import { Icon } from '../ui/Icon';
import { Spinner } from '../ui/Spinner';
import { useToast } from '../ui/Toast';

/** Muestra la empresa activa y permite cambiarla si hay varias. */
export function TenantSwitcher() {
  const { tenants } = useAuthenticatedSession();
  const activeTenant = useActiveTenant();
  const { switchTenant } = useSession();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  const select = async (tenantId: string, tenantName: string) => {
    if (tenantId === activeTenant.id) return close();
    setPendingId(tenantId);
    try {
      await switchTenant(tenantId);
      // El AppShell se remonta por tenant (ver App.tsx), descartando estado
      // de datos del tenant anterior; además se vuelve al dashboard.
      navigate('/');
      notify(`Ahora trabajas en ${tenantName}.`, 'info');
    } catch (error) {
      const kind = classifyApiError(error);
      // 401 ya cerró la sesión en el provider; no hace falta otro aviso.
      if (kind !== 'unauthorized') {
        notify(
          kind === 'not-found'
            ? 'Esa empresa ya no está disponible para tu usuario.'
            : apiErrorMessage(kind),
          'danger',
        );
      }
      setPendingId(null);
    }
  };

  const summary = (
    <>
      <span className="tenant-switcher__icon" aria-hidden="true">
        <Icon name="building" size={16} />
      </span>
      <span className="tenant-switcher__text">
        <span className="tenant-switcher__name">{activeTenant.name}</span>
        <span className="tenant-switcher__role">
          {roleLabel(activeTenant.role)}
        </span>
      </span>
    </>
  );

  if (tenants.length <= 1) {
    return <div className="tenant-switcher">{summary}</div>;
  }

  return (
    <div className="popover-anchor" ref={ref}>
      <button
        type="button"
        className="tenant-switcher tenant-switcher--button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        {summary}
        <Icon
          name="chevronDown"
          size={16}
          className="tenant-switcher__chevron"
        />
        <span className="sr-only">Cambiar empresa</span>
      </button>
      {open && (
        <div id={menuId} className="popover popover--full">
          <p className="popover__label">Tus empresas</p>
          <ul className="menu-list">
            {tenants.map((tenant) => {
              const active = tenant.id === activeTenant.id;
              return (
                <li key={tenant.id}>
                  <button
                    type="button"
                    className={cx('menu-item', active && 'is-active')}
                    aria-current={active ? 'true' : undefined}
                    disabled={pendingId !== null}
                    onClick={() => void select(tenant.id, tenant.name)}
                  >
                    <span className="menu-item__text">
                      <span>{tenant.name}</span>
                      <span className="menu-item__meta">
                        {roleLabel(tenant.role)}
                      </span>
                    </span>
                    {pendingId === tenant.id ? (
                      <Spinner size={16} />
                    ) : (
                      active && <Icon name="check" size={16} />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
