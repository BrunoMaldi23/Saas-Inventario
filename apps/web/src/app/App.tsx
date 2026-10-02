import { useEffect } from 'react';
import { AppShell } from '../components/layout/AppShell';
import {
  ErrorState,
  ForbiddenState,
  LoadingState,
} from '../components/ui/States';
import { ToastProvider } from '../components/ui/Toast';
import { navigate, usePathname } from '../lib/router';
import { LoginPage } from '../pages/LoginPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { SelectTenantPage } from '../pages/SelectTenantPage';
import { SessionProvider, useSession } from '../session/SessionProvider';
import { appRoutes, LOGIN_PATH, SELECT_TENANT_PATH } from './routes';

function Redirect({ to }: { to: string }) {
  useEffect(() => navigate(to, { replace: true }), [to]);
  return null;
}

/*
 * Decide qué mostrar según el estado de sesión. Cada estado tiene un único
 * destino posible, por lo que no hay redirecciones en cadena. Estas guardas
 * solo ordenan la navegación: la autorización real la aplica el backend.
 */
function Router() {
  const pathname = usePathname();
  const { state, reload, can } = useSession();

  if (state.status === 'loading') {
    return (
      <div className="full-page">
        <LoadingState label="Verificando sesión…" />
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="full-page">
        <ErrorState
          icon="wifiOff"
          title="No pudimos verificar tu sesión"
          description={state.message}
          onRetry={reload}
        />
      </div>
    );
  }

  if (state.status === 'unauthenticated') {
    return (
      <>
        {pathname !== LOGIN_PATH && <Redirect to={LOGIN_PATH} />}
        <LoginPage reason={state.reason} />
      </>
    );
  }

  const { activeTenant } = state.session;
  if (activeTenant === null) {
    return (
      <>
        {pathname !== SELECT_TENANT_PATH && (
          <Redirect to={SELECT_TENANT_PATH} />
        )}
        <SelectTenantPage />
      </>
    );
  }

  if (pathname === LOGIN_PATH || pathname === SELECT_TENANT_PATH) {
    return <Redirect to="/" />;
  }

  const route = appRoutes.find((r) => r.path === pathname);
  const allowed = route ? can(route.permission) : true;
  return (
    // key: al cambiar de tenant se remonta todo el árbol y se descarta
    // cualquier estado de datos del tenant anterior.
    <AppShell
      key={activeTenant.id}
      title={route?.title ?? 'Página no encontrada'}
    >
      {!route ? (
        <NotFoundPage />
      ) : allowed ? (
        route.render()
      ) : (
        <ForbiddenState />
      )}
    </AppShell>
  );
}

export function App() {
  return (
    <SessionProvider>
      <ToastProvider>
        <Router />
      </ToastProvider>
    </SessionProvider>
  );
}
