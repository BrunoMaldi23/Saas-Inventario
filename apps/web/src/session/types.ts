import type {
  AuthSessionResponse,
  LoginRequest,
  TenantOption,
} from '@inventario/types';

/**
 * Sesión que consume la UI: la respuesta real de /auth/me más los tenants
 * disponibles (GET /tenants) para el selector de empresa.
 */
export type Session = AuthSessionResponse & {
  tenants: TenantOption[];
};

/**
 * Puerto de autenticación de la UI. La implementación real vive en
 * apiSessionSource.ts; los componentes solo conocen esta interfaz.
 */
export interface SessionSource {
  /** null si no hay sesión (401). Otros errores se propagan. */
  getSession(): Promise<Session | null>;
  login(credentials: LoginRequest): Promise<Session>;
  switchTenant(tenantId: string): Promise<Session>;
  logout(): Promise<void>;
}

/** Traducciones de los roles base de docs/ARCHITECTURE.md (RBAC). */
const baseRoleLabels: Partial<Record<string, string>> = {
  Owner: 'Propietario',
  Admin: 'Administrador',
  InventoryManager: 'Encargado de inventario',
  BranchManager: 'Jefe de sucursal',
  Viewer: 'Solo lectura',
};

/**
 * Etiqueta visible de un rol; los roles no conocidos se muestran tal cual.
 * Solo es presentación: no se usa para decidir permisos.
 */
export function roleLabel(roleName: string): string {
  return baseRoleLabels[roleName] ?? roleName;
}
