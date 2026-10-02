import { useCallback, useId, useRef, useState } from 'react';
import { cx } from '../../lib/cx';
import { navigate } from '../../lib/router';
import { useDismiss } from '../../lib/useDismiss';
import {
  useAuthenticatedSession,
  useSession,
} from '../../session/SessionProvider';
import { roleLabel } from '../../session/types';
import { Icon } from '../ui/Icon';
import { Spinner } from '../ui/Spinner';
import { useToast } from '../ui/Toast';

/** Muestra la empresa activa y permite cambiarla si hay varias membresías. */
export function TenantSwitcher() {
  const session = useAuthenticatedSession();
  const { activeMembership, switchTenant } = useSession();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  if (!activeMembership) return null;
  const canSwitch = session.memberships.length > 1;

  const select = async (tenantId: string, tenantName: string) => {
    if (tenantId === activeMembership.tenantId) return close();
    setPendingId(tenantId);
    try {
      await switchTenant(tenantId);
      close();
      // Volver al inicio evita mostrar vistas cargadas con datos del tenant anterior.
      navigate('/');
      notify(`Ahora trabajas en ${tenantName}.`, 'info');
    } catch {
      notify('No pudimos cambiar de empresa. Inténtalo nuevamente.', 'danger');
    } finally {
      setPendingId(null);
    }
  };

  const summary = (
    <>
      <span className="tenant-switcher__icon" aria-hidden="true">
        <Icon name="building" size={16} />
      </span>
      <span className="tenant-switcher__text">
        <span className="tenant-switcher__name">
          {activeMembership.tenantName}
        </span>
        <span className="tenant-switcher__role">
          {roleLabel(activeMembership.roleName)}
        </span>
      </span>
    </>
  );

  if (!canSwitch) {
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
            {session.memberships.map((membership) => {
              const active = membership.tenantId === activeMembership.tenantId;
              return (
                <li key={membership.tenantId}>
                  <button
                    type="button"
                    className={cx('menu-item', active && 'is-active')}
                    aria-current={active ? 'true' : undefined}
                    disabled={pendingId !== null}
                    onClick={() =>
                      void select(membership.tenantId, membership.tenantName)
                    }
                  >
                    <span className="menu-item__text">
                      <span>{membership.tenantName}</span>
                      <span className="menu-item__meta">
                        {roleLabel(membership.roleName)}
                      </span>
                    </span>
                    {pendingId === membership.tenantId ? (
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
