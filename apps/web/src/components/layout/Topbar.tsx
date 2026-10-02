import { IconButton } from '../ui/Button';
import { UserMenu } from './UserMenu';

type TopbarProps = {
  title: string;
  sidebarOpen: boolean;
  onOpenSidebar: () => void;
};

export function Topbar({ title, sidebarOpen, onOpenSidebar }: TopbarProps) {
  return (
    <header className="topbar">
      <IconButton
        icon="menu"
        label="Abrir menú"
        className="topbar__menu"
        aria-expanded={sidebarOpen}
        aria-controls="app-sidebar"
        onClick={onOpenSidebar}
      />
      <p className="topbar__title">{title}</p>
      <div className="topbar__actions">
        <UserMenu />
      </div>
    </header>
  );
}
