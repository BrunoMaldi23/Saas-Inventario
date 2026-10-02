import { useEffect, type ReactNode } from 'react';
import { isMockSession } from '../../session/sessionSource';
import { Icon } from '../ui/Icon';

type AuthLayoutProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

/** Layout centrado para pantallas sin navegación (login, selección de empresa). */
export function AuthLayout({ title, description, children }: AuthLayoutProps) {
  useEffect(() => {
    document.title = `${title} · InventarioSaaS`;
  }, [title]);

  return (
    <main className="auth-layout">
      <div className="auth-card">
        <div className="auth-card__brand">
          <span className="sidebar__logo" aria-hidden="true">
            <Icon name="box" size={18} />
          </span>
          <span>InventarioSaaS</span>
        </div>
        <h1 className="auth-card__title">{title}</h1>
        {description && <p className="auth-card__description">{description}</p>}
        {children}
      </div>
      {isMockSession && (
        <p className="auth-layout__footnote">
          Entorno de demostración: la autenticación aún usa datos simulados.
        </p>
      )}
    </main>
  );
}
