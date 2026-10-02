import { lazy, Suspense, type ReactNode } from 'react';
import { LoadingState } from '../components/ui/States';
import { Permission } from '../lib/permissions';
import { HealthPage } from '../features/health/HealthPage';
import { DashboardPage } from '../pages/DashboardPage';
import {
  InventoryPage,
  MovementsPage,
  SuppliersPage,
  WarehousesPage,
} from '../pages/modulePages';
import { ProductsPage } from '../pages/ProductsPage';
import { ProfilePage } from '../pages/ProfilePage';
import { ReportsPage } from '../pages/ReportsPage';
import { SettingsPage } from '../pages/SettingsPage';
import { UsersPage } from '../pages/UsersPage';

// Catálogo de componentes: import dinámico para que no llegue al bundle de producción.
const ComponentsPage = import.meta.env.DEV
  ? lazy(() =>
      import('../pages/ComponentsPage').then((m) => ({
        default: m.ComponentsPage,
      })),
    )
  : null;

export type AppRoute = {
  path: string;
  title: string;
  render: () => ReactNode;
  /** Permiso requerido; sin él se muestra un estado 403 en vez de la página. */
  permission?: string;
};

/** Rutas autenticadas, dentro del AppShell. */
export const appRoutes: AppRoute[] = [
  { path: '/', title: 'Dashboard', render: () => <DashboardPage /> },
  { path: '/productos', title: 'Productos', render: () => <ProductsPage /> },
  { path: '/inventario', title: 'Inventario', render: () => <InventoryPage /> },
  {
    path: '/movimientos',
    title: 'Movimientos',
    render: () => <MovementsPage />,
  },
  { path: '/bodegas', title: 'Bodegas', render: () => <WarehousesPage /> },
  {
    path: '/proveedores',
    title: 'Proveedores',
    render: () => <SuppliersPage />,
  },
  { path: '/reportes', title: 'Reportes', render: () => <ReportsPage /> },
  {
    path: '/usuarios',
    title: 'Usuarios',
    render: () => <UsersPage />,
    permission: Permission.UsersRead,
  },
  {
    path: '/configuracion',
    title: 'Configuración',
    render: () => <SettingsPage />,
  },
  { path: '/perfil', title: 'Mi perfil', render: () => <ProfilePage /> },
  {
    path: '/sistema',
    title: 'Estado del sistema',
    render: () => <HealthPage />,
  },
  ...(ComponentsPage
    ? [
        {
          path: '/sistema/componentes',
          title: 'Componentes',
          render: () => (
            <Suspense fallback={<LoadingState />}>
              <ComponentsPage />
            </Suspense>
          ),
        },
      ]
    : []),
];

/** Rutas sin sesión o previas a elegir tenant. */
export const LOGIN_PATH = '/login';
export const SELECT_TENANT_PATH = '/seleccionar-empresa';
