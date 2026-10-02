import { useEffect } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { ErrorState, LoadingState } from '../components/ui/States';
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
 * Decide qué mostrar según el estado de sesión. Estas guardas solo ordenan la
 * navegación: la autorización real siempre la aplica el backend.
 */
function Router() {
  const pathname = usePathname();
  const { state, reload } = useSession();

  if (state.status === 'loading') {
    return (
      <div className="full-page">
        <LoadingState label="Cargando sesión…" />
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="full-page">
        <ErrorState description={state.message} onRetry={reload} />
      </div>
    );
  }

  if (state.status === 'unauthenticated') {
    return (
      <>
        {pathname !== LOGIN_PATH && <Redirect to={LOGIN_PATH} />}
        <LoginPage />
      </>
    );
  }

  if (state.session.activeTenantId === null) {
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
  return (
    <AppShell title={route?.title ?? 'Página no encontrada'}>
      {route ? route.render() : <NotFoundPage />}
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
