import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ActiveTenant, LoginRequest } from '../lib/apiTypes';
import { apiErrorMessage, classifyApiError } from '../lib/apiError';
import { hasPermission } from '../lib/permissions';
import { sessionSource } from './sessionSource';
import type { Session } from './types';

/** Motivo por el que no hay sesión; define el mensaje del login. */
export type SignedOutReason = 'initial' | 'signed-out' | 'expired';

type SessionState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'unauthenticated'; reason: SignedOutReason }
  | { status: 'authenticated'; session: Session };

type SessionContextValue = {
  state: SessionState;
  activeTenant: ActiveTenant | null;
  /** Permiso efectivo en el tenant activo (solo para decidir qué mostrar). */
  can: (permission: string | undefined) => boolean;
  reload: () => void;
  login: (credentials: LoginRequest) => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Llamar cuando una petición de datos responde 401. */
  expireSession: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

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

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession debe usarse dentro de <SessionProvider>.');
  }
  return context;
}

/** Atajo para componentes que solo se montan con sesión autenticada. */
export function useAuthenticatedSession(): Session {
  const { state } = useSession();
  if (state.status !== 'authenticated') {
    throw new Error('Se requiere una sesión autenticada.');
  }
  return state.session;
}

/** Atajo para componentes dentro del AppShell (tenant activo garantizado). */
export function useActiveTenant(): ActiveTenant {
  const { activeTenant } = useSession();
  if (!activeTenant) throw new Error('Se requiere un tenant activo.');
  return activeTenant;
}
