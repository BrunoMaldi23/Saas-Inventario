/*
 * MOCK TEMPORAL — eliminar cuando exista la API de autenticación (Fase 2).
 *
 * Simula en memoria el comportamiento esperado del backend para poder
 * construir login, selector de empresa y estados de sesión. No valida
 * credenciales reales: acepta cualquier correo con formato válido y una
 * contraseña de al menos 8 caracteres (regla de DEC-010).
 */
import {
  InvalidCredentialsError,
  type LoginCredentials,
  type Session,
  type SessionSource,
} from './types.ts';

const demoSession: Session = {
  user: {
    id: 'mock-user-1',
    email: 'demo@inventario.local',
    name: 'Usuario Demo',
  },
  memberships: [
    {
      tenantId: 'mock-tenant-1',
      tenantName: 'Comercial Demo',
      roleName: 'Owner',
    },
    {
      tenantId: 'mock-tenant-2',
      tenantName: 'Distribuidora Ejemplo',
      roleName: 'Viewer',
    },
  ],
  activeTenantId: 'mock-tenant-1',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function createMockSessionSource(
  options: { latencyMs?: number; startAuthenticated?: boolean } = {},
): SessionSource {
  const { latencyMs = 350, startAuthenticated = true } = options;
  let current: Session | null = startAuthenticated
    ? structuredClone(demoSession)
    : null;

  const delay = () =>
    latencyMs > 0
      ? new Promise<void>((resolve) => setTimeout(resolve, latencyMs))
      : Promise.resolve();

  return {
    async getSession() {
      await delay();
      return current ? structuredClone(current) : null;
    },

    async login({ email, password }: LoginCredentials) {
      await delay();
      if (!EMAIL_PATTERN.test(email.trim()) || password.length < 8) {
        throw new InvalidCredentialsError();
      }
      // Con varias membresías el usuario debe elegir empresa explícitamente.
      current = {
        ...structuredClone(demoSession),
        user: { ...demoSession.user, email: email.trim().toLowerCase() },
        activeTenantId: null,
      };
      return structuredClone(current);
    },

    async switchTenant(tenantId: string) {
      await delay();
      if (!current) throw new Error('No hay sesión activa.');
      const isMember = current.memberships.some((m) => m.tenantId === tenantId);
      if (!isMember) throw new Error('No perteneces a esa empresa.');
      current = { ...current, activeTenantId: tenantId };
      return structuredClone(current);
    },

    async logout() {
      await delay();
      current = null;
    },
  };
}
