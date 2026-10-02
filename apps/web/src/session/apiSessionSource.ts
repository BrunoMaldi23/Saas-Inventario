import type {
  AuthSessionResponse,
  LoginRequest,
  SelectTenantRequest,
  TenantsResponse,
} from '../lib/apiTypes.ts';
import { classifyApiError } from '../lib/apiError.ts';
import type { Session, SessionSource } from './types.ts';

/** Subconjunto de @inventario/api-client que usa la sesión (inyectable en tests). */
export type AuthClient = {
  getMe(): Promise<AuthSessionResponse>;
  login(input: LoginRequest): Promise<AuthSessionResponse>;
  logout(): Promise<void>;
  listTenants(): Promise<TenantsResponse>;
  selectTenant(input: SelectTenantRequest): Promise<AuthSessionResponse>;
};

/*
 * Sesión real basada en cookie HTTP-only: el navegador envía la cookie y el
 * frontend nunca la lee ni guarda tokens. El estado de verdad es /auth/me.
 */
export function createApiSessionSource(client: AuthClient): SessionSource {
  async function withTenants(auth: AuthSessionResponse): Promise<Session> {
    const { tenants } = await client.listTenants();
    return { ...auth, tenants };
  }

  /** Con una única empresa disponible se selecciona sin preguntar. */
  async function autoSelectSingleTenant(session: Session): Promise<Session> {
    const [only] = session.tenants;
    if (session.activeTenant || session.tenants.length !== 1 || !only) {
      return session;
    }
    const auth = await client.selectTenant({ tenantId: only.id });
    return { ...auth, tenants: session.tenants };
  }

  return {
    async getSession() {
      let auth: AuthSessionResponse;
      try {
        auth = await client.getMe();
      } catch (error) {
        if (classifyApiError(error) === 'unauthorized') return null;
        throw error;
      }
      return autoSelectSingleTenant(await withTenants(auth));
    },

    async login(credentials) {
      const auth = await client.login(credentials);
      return autoSelectSingleTenant(await withTenants(auth));
    },

    async switchTenant(tenantId) {
      const auth = await client.selectTenant({ tenantId });
      // Se refresca la lista: una membresía pudo cambiar desde el login.
      return withTenants(auth);
    },

    async logout() {
      try {
        await client.logout();
      } catch (error) {
        // Si la sesión ya no existía, el objetivo (quedar sin sesión) se cumple.
        if (classifyApiError(error) !== 'unauthorized') throw error;
      }
    },
  };
}
