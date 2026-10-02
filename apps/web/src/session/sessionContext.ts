import { createContext, useContext } from 'react';
import type { ActiveTenant, LoginRequest } from '@inventario/types';
import type { Session } from './types';

/*
 * Contexto y hooks de sesión, separados de SessionProvider.tsx para que ese
 * archivo exporte solo componentes: si un módulo mezcla componentes y hooks,
 * Fast Refresh lo invalida, recrea el contexto y los consumidores quedan
 * apuntando a uno distinto ("useSession debe usarse dentro de...").
 */

/** Motivo por el que no hay sesión; define el mensaje del login. */
export type SignedOutReason = 'initial' | 'signed-out' | 'expired';

export type SessionState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'unauthenticated'; reason: SignedOutReason }
  | { status: 'authenticated'; session: Session };

export type SessionContextValue = {
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
  /** Confirma con el backend si la sesión sigue vigente (false = expiró). */
  revalidate: () => Promise<boolean>;
};

export const SessionContext = createContext<SessionContextValue | null>(null);

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
