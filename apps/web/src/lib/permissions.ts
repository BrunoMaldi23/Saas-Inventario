/*
 * Permisos de UI. Solo deciden qué se muestra: la autorización real la aplica
 * el backend. La fuente es siempre activeTenant.permissions; nunca se infieren
 * permisos a partir del nombre del rol.
 */

/** Permisos publicados por el backend (docs/API_CONTRACTS.md). */
export const Permission = {
  UsersRead: 'users:read',
  UsersCreate: 'users:create',
  MembershipsManage: 'memberships:manage',
} as const;

/** Sin permiso requerido el elemento es visible para cualquier sesión. */
export function hasPermission(
  permissions: readonly string[],
  required: string | undefined,
): boolean {
  return required === undefined || permissions.includes(required);
}
