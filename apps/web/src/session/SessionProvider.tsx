import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { sessionSource } from './sessionSource';
import type {
  LoginCredentials,
  Session,
  TenantMembershipSummary,
} from './types';

type SessionState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; session: Session };

type SessionContextValue = {
  state: SessionState;
  /** Membresía del tenant activo; null si no hay sesión o no se eligió. */
  activeMembership: TenantMembershipSummary | null;
  reload: () => void;
  login: (credentials: LoginCredentials) => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

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
            : { status: 'unauthenticated' },
        );
      })
      .catch(() => {
        if (active) {
          setState({
            status: 'error',
            message: 'No pudimos verificar tu sesión.',
          });
        }
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const session = await sessionSource.login(credentials);
    setState({ status: 'authenticated', session });
  }, []);

  const switchTenant = useCallback(async (tenantId: string) => {
    const session = await sessionSource.switchTenant(tenantId);
    setState({ status: 'authenticated', session });
  }, []);

  const logout = useCallback(async () => {
    await sessionSource.logout();
    setState({ status: 'unauthenticated' });
  }, []);

  const activeMembership = useMemo(() => {
    if (state.status !== 'authenticated') return null;
    const { memberships, activeTenantId } = state.session;
    return memberships.find((m) => m.tenantId === activeTenantId) ?? null;
  }, [state]);

  const value = useMemo(
    () => ({ state, activeMembership, reload, login, switchTenant, logout }),
    [state, activeMembership, reload, login, switchTenant, logout],
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
