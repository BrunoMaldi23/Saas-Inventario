import type { IconName } from '../components/ui/Icon';
import { hasPermission, Permission } from '../lib/permissions.ts';

export type NavItem = {
  label: string;
  to: string;
  icon: IconName;
  /**
   * Permiso requerido para mostrar el enlace. Los módulos sin permiso
   * publicado por el backend aún no lo declaran y quedan visibles.
   */
  permission?: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const navigation: NavGroup[] = [
  {
    label: 'General',
    items: [{ label: 'Dashboard', to: '/', icon: 'dashboard' }],
  },
  {
    label: 'Catálogo',
    items: [
      {
        label: 'Productos',
        to: '/productos',
        icon: 'box',
        permission: Permission.ProductsRead,
      },
      {
        label: 'Categorías',
        to: '/categorias',
        icon: 'tag',
        permission: Permission.CategoriesRead,
      },
      {
        label: 'Proveedores',
        to: '/proveedores',
        icon: 'truck',
        permission: Permission.SuppliersRead,
      },
    ],
  },
  {
    label: 'Inventario',
    items: [
      // Fase 4: aún sin permiso publicado; se muestran como módulos en preparación.
      { label: 'Inventario', to: '/inventario', icon: 'layers' },
      { label: 'Movimientos', to: '/movimientos', icon: 'movements' },
      {
        label: 'Bodegas',
        to: '/bodegas',
        icon: 'warehouse',
        permission: Permission.WarehousesRead,
      },
    ],
  },
  {
    label: 'Organización',
    items: [
      {
        label: 'Empresas',
        to: '/empresas',
        icon: 'building',
        permission: Permission.CompaniesRead,
      },
      {
        label: 'Sucursales',
        to: '/sucursales',
        icon: 'mapPin',
        permission: Permission.BranchesRead,
      },
    ],
  },
  {
    label: 'Análisis',
    items: [{ label: 'Reportes', to: '/reportes', icon: 'chart' }],
  },
  {
    label: 'Administración',
    items: [
      {
        label: 'Usuarios',
        to: '/usuarios',
        icon: 'users',
        permission: Permission.UsersRead,
      },
      { label: 'Configuración', to: '/configuracion', icon: 'settings' },
      { label: 'Estado del sistema', to: '/sistema', icon: 'activity' },
    ],
  },
];

/** Navegación visible para los permisos del tenant activo; omite grupos vacíos. */
export function visibleNavigation(
  groups: NavGroup[],
  permissions: readonly string[],
): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        hasPermission(permissions, item.permission),
      ),
    }))
    .filter((group) => group.items.length > 0);
}
