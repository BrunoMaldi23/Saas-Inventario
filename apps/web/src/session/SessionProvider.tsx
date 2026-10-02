import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { LoginRequest } from '../lib/apiTypes';
import { apiErrorMessage, classifyApiError } from '../lib/apiError';
import { hasPermission } from '../lib/permissions';
import { sessionSource } from './sessionSource';
import { SessionContext, type SessionState } from './sessionContext';

// setTimeout acepta como máximo ~24,8 días.
const MAX_TIMEOUT_MS = 2_147_483_647;
const MIN_REVALIDATE_MS = 30_000;

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    sessionSource
      .getSession()
      .then((session) => {
        if (!active) return;
        setState(
          session
            ? { status: 'authenticated', session }
            : { status: 'unauthenticated', reason: 'initial' },
        );
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            status: 'error',
            message: apiErrorMessage(classifyApiError(error)),
          });
        }
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const expireSession = useCallback(() => {
    setState({ status: 'unauthenticated', reason: 'expired' });
  }, []);

  const session = state.status === 'authenticated' ? state.session : null;

  // Al vencer expiresAt se consulta al backend, que es quien decide.
  useEffect(() => {
    if (!session) return;
    const revalidate = () => {
      sessionSource
        .getSession()
        .then((next) => {
          if (!next) expireSession();
          else setState({ status: 'authenticated', session: next });
        })
        .catch(() => {
          // Sin conexión no se cierra la sesión: la próxima petición decidirá.
        });
    };
    // Piso de 30 s: con el reloj local adelantado y una sesión aún válida en
    // el backend, un timeout de 0 ms revalidaría en bucle.
    const msUntilExpiry = Date.parse(session.expiresAt) - Date.now();
    const timer = window.setTimeout(
      revalidate,
      Math.min(Math.max(msUntilExpiry, MIN_REVALIDATE_MS), MAX_TIMEOUT_MS),
    );
    // Al volver a la pestaña se detecta una sesión revocada o vencida.
    const onVisibility = () => {
      if (document.visibilityState === 'visible') revalidate();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [session, expireSession]);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  const login = useCallback(async (credentials: LoginRequest) => {
    const next = await sessionSource.login(credentials);
    setState({ status: 'authenticated', session: next });
  }, []);

  const switchTenant = useCallback(
    async (tenantId: string) => {
      try {
        const next = await sessionSource.switchTenant(tenantId);
        setState({ status: 'authenticated', session: next });
      } catch (error) {
        if (classifyApiError(error) === 'unauthorized') expireSession();
        throw error;
      }
    },
    [expireSession],
  );

  const logout = useCallback(async () => {
    await sessionSource.logout();
    setState({ status: 'unauthenticated', reason: 'signed-out' });
  }, []);

  const activeTenant = session?.activeTenant ?? null;

  const can = useCallback(
    (permission: string | undefined) =>
      activeTenant !== null &&
      hasPermission(activeTenant.permissions, permission),
    [activeTenant],
  );

  const value = useMemo(
    () => ({
      state,
      activeTenant,
      can,
      reload,
      login,
      switchTenant,
      logout,
      expireSession,
    }),
    [
      state,
      activeTenant,
      can,
      reload,
      login,
      switchTenant,
      logout,
      expireSession,
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
