import type { IconName } from '../components/ui/Icon';

export type NavItem = {
  label: string;
  to: string;
  icon: IconName;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

/*
 * Navegación principal. Hoy se muestra completa para cualquier sesión: la
 * visibilidad por permiso se aplicará cuando el backend exponga los permisos
 * efectivos del tenant activo (no se infieren permisos en el frontend).
 */
export const navigation: NavGroup[] = [
  {
    label: 'General',
    items: [{ label: 'Dashboard', to: '/', icon: 'dashboard' }],
  },
  {
    label: 'Inventario',
    items: [
      { label: 'Productos', to: '/productos', icon: 'box' },
      { label: 'Inventario', to: '/inventario', icon: 'layers' },
      { label: 'Movimientos', to: '/movimientos', icon: 'movements' },
      { label: 'Bodegas', to: '/bodegas', icon: 'warehouse' },
    ],
  },
  {
    label: 'Abastecimiento',
    items: [{ label: 'Proveedores', to: '/proveedores', icon: 'truck' }],
  },
  {
    label: 'Análisis',
    items: [{ label: 'Reportes', to: '/reportes', icon: 'chart' }],
  },
  {
    label: 'Administración',
    items: [
      { label: 'Usuarios', to: '/usuarios', icon: 'users' },
      { label: 'Configuración', to: '/configuracion', icon: 'settings' },
      { label: 'Estado del sistema', to: '/sistema', icon: 'activity' },
    ],
  },
];
