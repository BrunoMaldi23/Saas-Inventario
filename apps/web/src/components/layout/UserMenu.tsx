import { useCallback, useId, useRef, useState } from 'react';
import { Link } from '../../lib/router';
import { useDismiss } from '../../lib/useDismiss';
import {
  useAuthenticatedSession,
  useSession,
} from '../../session/sessionContext';
import { Avatar } from '../ui/Avatar';
import { ConfirmDialog } from '../ui/Dialog';
import { Icon } from '../ui/Icon';
import { useToast } from '../ui/toastContext';

export function UserMenu() {
  const { user } = useAuthenticatedSession();
  const { logout } = useSession();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  const confirmLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      setLoggingOut(false);
      setConfirming(false);
      notify('No pudimos cerrar la sesión. Inténtalo nuevamente.', 'danger');
    }
  };

  return (
    <div className="popover-anchor" ref={ref}>
      <button
        type="button"
        className="user-button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <Avatar name={user.name} />
        <span className="user-button__name">{user.name}</span>
        <Icon name="chevronDown" size={16} className="user-button__chevron" />
        <span className="sr-only">Menú de usuario</span>
      </button>

      {open && (
        <div id={menuId} className="popover popover--end">
          <div className="popover__header">
            <p className="popover__title">{user.name}</p>
            <p className="popover__subtitle">{user.email}</p>
          </div>
          <ul className="menu-list">
            <li>
              <Link to="/perfil" className="menu-item" onClick={close}>
                <Icon name="user" size={16} />
                <span>Mi perfil</span>
              </Link>
            </li>
            <li>
              <button
                type="button"
                className="menu-item menu-item--danger"
                onClick={() => {
                  close();
                  setConfirming(true);
                }}
              >
                <Icon name="logout" size={16} />
                <span>Cerrar sesión</span>
              </button>
            </li>
          </ul>
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        title="¿Cerrar sesión?"
        description="Tendrás que ingresar nuevamente tus credenciales para continuar."
        confirmLabel="Cerrar sesión"
        loading={loggingOut}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void confirmLogout()}
      />
    </div>
  );
}
