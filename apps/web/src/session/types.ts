/*
 * Forma de sesión que la UI necesita. Es una PROPUESTA de contrato: cuando el
 * backend publique el definitivo en @inventario/types, estos tipos deben
 * reemplazarse por los compartidos.
 */

export type SessionUser = {
  id: string;
  email: string;
  name: string;
};

export type TenantMembershipSummary = {
  tenantId: string;
  tenantName: string;
  /**
   * Nombre del rol en ese tenant. Es texto libre porque en el schema los
   * roles son registros por tenant, no un enum cerrado.
   */
  roleName: string;
};

export type Session = {
  user: SessionUser;
  memberships: TenantMembershipSummary[];
  /** null cuando el usuario aún no eligió tenant activo. */
  activeTenantId: string | null;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

/**
 * Puerto que la UI usa para hablar con la autenticación. La implementación
 * mock vive en mockSessionSource.ts; la real llamará a @inventario/api-client.
 */
export interface SessionSource {
  getSession(): Promise<Session | null>;
  login(credentials: LoginCredentials): Promise<Session>;
  switchTenant(tenantId: string): Promise<Session>;
  logout(): Promise<void>;
}

/** Error de credenciales: mensaje genérico para no facilitar enumeración. */
export class InvalidCredentialsError extends Error {
  constructor() {
    super('Correo o contraseña incorrectos.');
    this.name = 'InvalidCredentialsError';
  }
}

/** Traducciones de los roles base de docs/ARCHITECTURE.md (RBAC). */
const baseRoleLabels: Partial<Record<string, string>> = {
  Owner: 'Propietario',
  Admin: 'Administrador',
  InventoryManager: 'Encargado de inventario',
  BranchManager: 'Jefe de sucursal',
  Viewer: 'Solo lectura',
};

/** Etiqueta visible de un rol; los roles no conocidos se muestran tal cual. */
export function roleLabel(roleName: string): string {
  return baseRoleLabels[roleName] ?? roleName;
}
