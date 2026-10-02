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
| `/productos`           | Productos (`products:read`)        |
| `/categorias`          | Categorías (`categories:read`)     |
| `/inventario`          | Inventario (`inventory:read`)      |
| `/movimientos`         | Movimientos (`inventory:read`)     |
| `/transferencias`      | Transferencias (`inventory:read`)  |
| `/bodegas`             | Bodegas (`warehouses:read`)        |
| `/empresas`            | Empresas (`companies:read`)        |
| `/sucursales`          | Sucursales (`branches:read`)       |
| `/proveedores`         | Proveedores (`suppliers:read`)     |
| `/reportes`            | Reportes                           |
| `/usuarios`            | Usuarios (`users:read`)            |
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
- **Tipos:** se importan directamente desde `@inventario/types`.

## Catálogo (Fase 3)

- `features/catalog/CatalogListPage.tsx` resuelve listado, búsqueda (debounce), filtro de estado, paginación, estados de vista, creación, edición y activación/desactivación. Cada pantalla de `pages/catalog/` solo define columnas y formulario.
- Las acciones de escritura se muestran con el permiso `*:write` del recurso; la lectura y la ruta usan `*:read`.
- Formularios: `features/catalog/specs.ts` (validación según el contrato, con tests) y `useEntityForm` (el PATCH envía solo los campos cambiados).
- Referencias (categoría de un producto, sucursal de una bodega…): `useCatalogOptions` carga una página de hasta 100 registros.
- Errores: 401 lleva al login, 403 muestra "sin permiso", 404 y 409 muestran mensajes propios de cada recurso, 400 indica que se revisen los datos y un error de red ofrece reintentar.
- El stock disponible no se muestra hasta que exista inventario (Fase 4); `minStock` es solo un umbral.

## Inventario (Fase 4)

- **Pantallas:** Inventario muestra saldos de `GET /inventory`, con filtros de producto, bodega y `lowStock`. Movimientos (`GET /inventory/movements`) filtra por producto, bodega, tipo, rango de fechas y usuario. Transferencias usa `GET /transfers` y `GET /transfers/:id`.
- **Operaciones:** un único `StockOperationDialog` cubre stock inicial, entrada, salida, ajuste y transferencia. Las acciones se muestran según `inventory:write`, `inventory:adjust` e `inventory:transfer`.
- **Saldos:** nunca se calculan. Se muestra el saldo real del par producto-bodega, y se bloquean salidas que lo superan o un stock inicial repetido. El backend sigue siendo la autoridad (409).
- **Validación:** `features/inventory/inventoryLogic.ts` (cantidades decimales exactas con BigInt, ajuste con motivo, transferencia con origen distinto del destino).
- **Productos:** `ProductPicker` busca en el servidor, sin cargar el catálogo completo.

## Contratos de Fase 4.1

- Errores: `lib/apiError.ts` traduce `ApiError.status` (0 = red) a un tipo de error de UI. No se interpreta el texto de los mensajes.
- Referencias: tablas y detalles usan las referencias resumidas de la API (`product`, `warehouse`, `actor`, `category`, `branch`, `company`, `parent`). No hay búsquedas auxiliares por ID; `useCatalogOptions` solo alimenta los selects de los formularios.
- Usuarios: "Agregar existente" usa `POST /memberships/by-email` (coincidencia exacta, sin búsqueda de usuarios).

## Mocks

No quedan mocks: todas las pantallas con datos usan la API real. Inventario, Movimientos y Reportes siguen siendo pantallas en preparación, sin datos.

## Proxy de desarrollo

`vite.config.ts` proxifica `/api` con `changeOrigin: false`. Es obligatorio: el `CsrfGuard` de la API compara `Origin` con `Host`, y si el proxy reescribe `Host`, todo POST (login incluido) recibe 403.

## Scripts

```powershell
pnpm --filter @inventario/web dev        # requiere la API para el health
pnpm --filter @inventario/web typecheck  # app + tests
pnpm --filter @inventario/web test       # node:test (sin dependencias extra)
pnpm --filter @inventario/web build
```

Los tests usan `node --test` con el type stripping nativo de Node 22: cubren lógica pura (`lib/`, `session/`, `app/navigation.ts`, validaciones y lógica de catálogo); la sesión se prueba con un cliente falso inyectado. Por eso los módulos que importan los tests usan imports con extensión `.ts`.

## Convenciones

- Colores, espacios y radios solo desde `styles/tokens.css`.
- Breakpoints: móvil `< 640px`, tablet `640–1023px`, escritorio `≥ 1024px` (bajo 1024 el sidebar es un drawer).
- Toda vista con datos remotos resuelve loading, empty, error y success (`components/ui/States.tsx`, `DataTable`).
- Sin cifras inventadas: un indicador sin datos muestra `—`.
- El acceso HTTP pasa por `@inventario/api-client`, nunca con `fetch` directo desde componentes.
