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

## Mocks (temporales)

| Archivo                            | Reemplazo                                                        |
| ---------------------------------- | ---------------------------------------------------------------- |
| `src/session/mockSessionSource.ts` | Implementación de `SessionSource` sobre `@inventario/api-client` |
| `src/mocks/productsPreview.ts`     | `GET` de productos (Fase 3)                                      |

Para retirar el mock de sesión: cambiar la única línea de `src/session/sessionSource.ts`, poner `isMockSession = false` (oculta los avisos de demo) y borrar el mock y su test. Ningún componente importa el mock directamente.

El mock acepta cualquier correo válido con contraseña de 8+ caracteres, y su estado vive en memoria (recargar la página restaura la sesión demo).

## Scripts

```powershell
pnpm --filter @inventario/web dev        # requiere la API para el health
pnpm --filter @inventario/web typecheck  # app + tests
pnpm --filter @inventario/web test       # node:test (sin dependencias extra)
pnpm --filter @inventario/web build
```

Los tests usan `node --test` con el type stripping nativo de Node 22: cubren lógica pura (`lib/`, `session/`). Por eso los módulos que importan los tests usan imports con extensión `.ts`.

## Convenciones

- Colores, espacios y radios solo desde `styles/tokens.css`.
- Breakpoints: móvil `< 640px`, tablet `640–1023px`, escritorio `≥ 1024px` (bajo 1024 el sidebar es un drawer).
- Toda vista con datos remotos resuelve loading, empty, error y success (`components/ui/States.tsx`, `DataTable`).
- Sin cifras inventadas: un indicador sin datos muestra `—`.
- El acceso HTTP pasa por `@inventario/api-client`, nunca con `fetch` directo desde componentes.
