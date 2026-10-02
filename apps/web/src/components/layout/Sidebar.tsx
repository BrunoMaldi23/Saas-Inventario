import { navigation } from '../../app/navigation';
import { cx } from '../../lib/cx';
import { isActivePath } from '../../lib/path';
import { Link, usePathname } from '../../lib/router';
import { IconButton } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { TenantSwitcher } from './TenantSwitcher';

type SidebarProps = {
  /** Estado del drawer en móvil/tablet; en escritorio siempre visible. */
  open: boolean;
  onClose: () => void;
};

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      <div
        className={cx('sidebar-overlay', open && 'is-open')}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        id="app-sidebar"
        className={cx('sidebar', open && 'is-open')}
        aria-label="Barra lateral"
      >
        <div className="sidebar__brand">
          <span className="sidebar__logo" aria-hidden="true">
            <Icon name="box" size={18} />
          </span>
          <span className="sidebar__product">InventarioSaaS</span>
          <IconButton
            icon="close"
            label="Cerrar menú"
            className="sidebar__close"
            onClick={onClose}
          />
        </div>

        <div className="sidebar__tenant">
          <TenantSwitcher />
        </div>

        <nav className="sidebar__nav" aria-label="Principal">
          {navigation.map((group) => (
            <div key={group.label} className="nav-group">
              <p className="nav-group__label">{group.label}</p>
              <ul className="nav-group__list">
                {group.items.map((item) => {
                  const active = isActivePath(pathname, item.to);
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        className={cx('nav-link', active && 'is-active')}
                        aria-current={active ? 'page' : undefined}
                        onClick={onClose}
                      >
                        <Icon name={item.icon} size={18} />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
