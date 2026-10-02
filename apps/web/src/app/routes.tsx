import { lazy, Suspense, type ReactNode } from 'react';
import { LoadingState } from '../components/ui/States';
import { Permission } from '../lib/permissions';
import { HealthPage } from '../features/health/HealthPage';
import { DashboardPage } from '../pages/DashboardPage';
import { BranchesPage } from '../pages/catalog/BranchesPage';
import { CategoriesPage } from '../pages/catalog/CategoriesPage';
import { CompaniesPage } from '../pages/catalog/CompaniesPage';
import { ProductsPage } from '../pages/catalog/ProductsPage';
import { SuppliersPage } from '../pages/catalog/SuppliersPage';
import { WarehousesPage } from '../pages/catalog/WarehousesPage';
import { InventoryPage } from '../pages/inventory/InventoryPage';
import { MovementsPage } from '../pages/inventory/MovementsPage';
import { TransfersPage } from '../pages/inventory/TransfersPage';
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
  {
    path: '/productos',
    title: 'Productos',
    render: () => <ProductsPage />,
    permission: Permission.ProductsRead,
  },
  {
    path: '/categorias',
    title: 'Categorías',
    render: () => <CategoriesPage />,
    permission: Permission.CategoriesRead,
  },
  {
    path: '/inventario',
    title: 'Inventario',
    render: () => <InventoryPage />,
    permission: Permission.InventoryRead,
  },
  {
    path: '/movimientos',
    title: 'Movimientos',
    render: () => <MovementsPage />,
    permission: Permission.InventoryRead,
  },
  {
    path: '/transferencias',
    title: 'Transferencias',
    render: () => <TransfersPage />,
    permission: Permission.InventoryRead,
  },
  {
    path: '/bodegas',
    title: 'Bodegas',
    render: () => <WarehousesPage />,
    permission: Permission.WarehousesRead,
  },
  {
    path: '/empresas',
    title: 'Empresas',
    render: () => <CompaniesPage />,
    permission: Permission.CompaniesRead,
  },
  {
    path: '/sucursales',
    title: 'Sucursales',
    render: () => <BranchesPage />,
    permission: Permission.BranchesRead,
  },
  {
    path: '/proveedores',
    title: 'Proveedores',
    render: () => <SuppliersPage />,
    permission: Permission.SuppliersRead,
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
