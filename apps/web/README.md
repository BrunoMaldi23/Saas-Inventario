# @inventario/web

Frontend de InventarioSaaS: React 19, Vite 7 y TypeScript estricto. Sin dependencias de UI externas.

## Estructura

```text
src/
  app/            App (guardas de sesión), rutas y navegación
  components/
    layout/       AppShell, Sidebar, Topbar, TenantSwitcher, UserMenu, AuthLayout
    ui/           Design system: Button, Field/Input/Select/SearchInput, Badge,
                  Card, PageHeader, StatCard, DataTable, FilterBar, Dialog/ConfirmDialog,
                  Toast, States (Loading/Empty/Error/Notice/Skeleton), Icon, Avatar
  features/health Pantalla técnica Frontend → API → Database
  lib/            Router mínimo, helpers puros (con tests)
  mocks/          Datos visuales temporales
  pages/          Pantallas
  session/        Tipos, puerto SessionSource, provider y mock
  styles/         tokens.css (variables), base, layout, components
```

## Rutas

| Ruta                   | Pantalla                           |
| ---------------------- | ---------------------------------- |
| `/`                    | Dashboard                          |
| `/productos`           | Productos (vista previa con mock)  |
| `/inventario`          | Inventario                         |
| `/movimientos`         | Movimientos                        |
| `/bodegas`             | Bodegas                            |
| `/proveedores`         | Proveedores                        |
| `/reportes`            | Reportes                           |
| `/usuarios`            | Usuarios                           |
| `/configuracion`       | Configuración                      |
| `/perfil`              | Mi perfil                          |
| `/sistema`             | Estado del sistema (health)        |
| `/sistema/componentes` | Catálogo de componentes (solo dev) |
| `/login`               | Inicio de sesión                   |
| `/seleccionar-empresa` | Selección de tenant                |

Las guardas en `app/App.tsx` solo ordenan la navegación; la autorización real la aplica el backend.

## Sesión y permisos

- **Sesión real:** `session/apiSessionSource.ts` implementa `SessionSource` sobre `@inventario/api-client` usando `/auth/me`, `/auth/login`, `/auth/logout`, `/tenants` y `/auth/select-tenant`. La cookie es HTTP-only: el frontend no la lee ni guarda tokens.
- **Tenants:** con una sola empresa se selecciona automáticamente; con varias se muestra `/seleccionar-empresa`. Al cambiar de tenant, el `AppShell` se remonta (`key` = id del tenant), lo que descarta el estado de datos anterior, y se vuelve al dashboard.
- **Errores:** `lib/apiError.ts` clasifica los errores del cliente. Un 401 lleva al login con aviso de expiración (`useApiQuery` y `expireSession`); un 403 muestra "No tienes permiso"; con el backend caído se muestra un estado de reintento. La sesión se revalida al llegar `expiresAt` y al volver a la pestaña.
- **Permisos:** la navegación y las acciones se filtran con `activeTenant.permissions` (`lib/permissions.ts`, `app/navigation.ts`, `permission` en `app/routes.tsx`). Nunca se infieren del nombre del rol. El backend sigue siendo la autoridad.
- **Tipos:** `lib/apiTypes.ts` toma los tipos de `@inventario/types` a través de las firmas de `@inventario/api-client`, porque `apps/web` aún no declara `@inventario/types` como dependencia directa.

## Mocks (temporales)

| Archivo                        | Reemplazo                   |
| ------------------------------ | --------------------------- |
| `src/mocks/productsPreview.ts` | `GET` de productos (Fase 3) |

## Proxy de desarrollo

`vite.config.ts` proxifica `/api` con `changeOrigin: false`. Es obligatorio: el `CsrfGuard` de la API compara `Origin` con `Host`, y si el proxy reescribe `Host`, todo POST (login incluido) recibe 403.

## Scripts

```powershell
pnpm --filter @inventario/web dev        # requiere la API para el health
pnpm --filter @inventario/web typecheck  # app + tests
pnpm --filter @inventario/web test       # node:test (sin dependencias extra)
pnpm --filter @inventario/web build
```

Los tests usan `node --test` con el type stripping nativo de Node 22: cubren lógica pura (`lib/`, `session/`, `app/navigation.ts`); la sesión se prueba con un cliente falso inyectado. Por eso los módulos que importan los tests usan imports con extensión `.ts`.

## Convenciones

- Colores, espacios y radios solo desde `styles/tokens.css`.
- Breakpoints: móvil `< 640px`, tablet `640–1023px`, escritorio `≥ 1024px` (bajo 1024 el sidebar es un drawer).
- Toda vista con datos remotos resuelve loading, empty, error y success (`components/ui/States.tsx`, `DataTable`).
- Sin cifras inventadas: un indicador sin datos muestra `—`.
- El acceso HTTP pasa por `@inventario/api-client`, nunca con `fetch` directo desde componentes.
