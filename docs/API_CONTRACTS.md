# Contratos API de identidad y catálogo (Fases 2 y 3)

Base: `/api/v1`. JSON en requests y responses. Usar el mismo origen web/API (proxy `/api` de Vite en desarrollo) y `credentials: 'same-origin'`. Los tipos y funciones están exportados desde `@inventario/types`, `@inventario/validation` y `@inventario/api-client`.

La cookie `inventario_session` es HTTP-only, `SameSite=Lax`, dura 8 horas y usa `Secure` en producción. El frontend no debe leerla ni enviar `userId`, `tenantId` o permisos para autorizar operaciones. La única excepción es `tenantId` en `select-tenant`, que el backend compara con la membresía del usuario. Las escrituras con `Origin` o `Referer` de otro origen se rechazan con 403.

## Sesión

| Método y ruta              | Body                                                 | Respuesta                               | Acceso                    |
| -------------------------- | ---------------------------------------------------- | --------------------------------------- | ------------------------- |
| `POST /auth/login`         | `{ "email": "user@example.com", "password": "..." }` | `AuthSessionResponse`; cookie de sesión | Público                   |
| `POST /auth/logout`        | Vacío                                                | 204; cookie borrada                     | Sesión                    |
| `GET /auth/me`             | —                                                    | `AuthSessionResponse`                   | Sesión                    |
| `GET /tenants`             | —                                                    | `{ "tenants": TenantOption[] }`         | Sesión                    |
| `POST /auth/select-tenant` | `{ "tenantId": "UUID" }`                             | `AuthSessionResponse`                   | Sesión y membresía activa |

`AuthSessionResponse`:

```json
{
  "user": { "id": "UUID", "email": "user@example.com", "name": "Nombre" },
  "activeTenant": null,
  "expiresAt": "2026-10-02T20:00:00.000Z"
}
```

Tras seleccionar tenant, `activeTenant` contiene `{ "id": "UUID", "name": "...", "role": "Owner", "permissions": ["users:read", "users:create", "memberships:manage"] }`. El login siempre inicia sin tenant activo. `GET /tenants` devuelve solo tenants activos con membresía activa, como objetos `{ id, name, role }`. Un tenant inexistente o sin membresía responde 404 en `select-tenant`.

## Administración de identidad

Todas estas rutas requieren sesión y tenant activo. IDs de roles y membresías se resuelven dentro de ese tenant. `UserSummary` contiene solo `{ id, email, name }`; nunca se devuelve `passwordHash`.

| Método y ruta                   | Body                                                                                     | Respuesta                                          | Permiso              |
| ------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------- | -------------------- |
| `GET /roles`                    | —                                                                                        | `{ "roles": [{ "id": "UUID", "name": "Owner" }] }` | `users:read`         |
| `GET /memberships`              | —                                                                                        | `{ "memberships": MembershipView[] }`              | `users:read`         |
| `POST /users`                   | `{ "email": "...", "name": "...", "password": "mínimo 8 caracteres", "roleId": "UUID" }` | `UserSummary`, 201                                 | `users:create`       |
| `POST /memberships`             | `{ "userId": "UUID", "roleId": "UUID" }`                                                 | `MembershipView`, 201                              | `memberships:manage` |
| `PATCH /memberships/:id/role`   | `{ "roleId": "UUID" }`                                                                   | `MembershipView`                                   | `memberships:manage` |
| `PATCH /memberships/:id/status` | `{ "status": "ACTIVE" o "INACTIVE" }`                                                    | `MembershipView`                                   | `memberships:manage` |

`MembershipView` contiene `{ id, user: UserSummary, role: { id, name }, status }`. `POST /users` crea una identidad nueva y su primera membresía; si el email global ya existe, responde 409. `POST /memberships` asocia por `userId` una identidad ya existente con el tenant activo. Owner administra todas las membresías. Admin puede crear y modificar usuarios con roles InventoryManager, BranchManager y Viewer, sin asignar ni modificar Owner o Admin. InventoryManager, BranchManager y Viewer no tienen permisos de identidad.

Errores principales: 400 payload inválido, 401 sesión ausente/expirada o credenciales inválidas, 403 tenant activo faltante o permiso insuficiente, 404 tenant/membresía/rol no accesible, 409 conflicto de unicidad o intento de retirar al último Owner activo. El login inválido y el usuario inactivo comparten el mismo 401 `Invalid credentials`.

Health de Fase 1 sigue público: `GET /health` y `GET /health/database`.

## Catálogo operacional (Fase 3)

Los seis recursos usan el prefijo `/api/v1`, requieren sesión y tenant activo, y nunca aceptan `tenantId` en el body. Cada recurso expone `GET /recurso`, `GET /recurso/:id`, `POST /recurso` y `PATCH /recurso/:id`. No hay DELETE; para desactivar se envía `{ "status": "INACTIVE" }` por PATCH. GET incluye registros activos e inactivos por defecto. Los IDs son UUID. Fechas se devuelven en ISO 8601. POST responde 201; GET y PATCH responden 200.

| Recurso | Permisos GET / POST-PATCH | Body POST (campos obligatorios) | Campos opcionales POST/PATCH |
| --- | --- | --- | --- |
| `companies` | `companies:read` / `companies:write` | `name` | `taxId`, `businessType`, `status` |
| `branches` | `branches:read` / `branches:write` | `companyId`, `name` | `address`, `status` |
| `categories` | `categories:read` / `categories:write` | `name` | `parentId`, `status` |
| `products` | `products:read` / `products:write` | `name`, `unitOfMeasure` | `categoryId`, `sku`, `barcode`, `description`, `minStock`, `status` |
| `suppliers` | `suppliers:read` / `suppliers:write` | `name` | `taxId`, `email`, `phone`, `status` |
| `warehouses` | `warehouses:read` / `warehouses:write` | `branchId`, `name`, `type` | `status` |

PATCH acepta cualquier subconjunto **no vacío** de campos del recurso. Las referencias opcionales `parentId` y `categoryId` aceptan `null` para desvincular. Los textos opcionales aceptan `null` para limpiar; `sku`, `barcode` y `minStock` también. `status` solo admite `ACTIVE` o `INACTIVE`. Nombre: 1–120 caracteres; SKU: 1–80, letras ASCII, números, punto, guion o guion bajo, normalizado a mayúsculas; barcode: 1–80 caracteres alfanuméricos ASCII. `minStock` es string decimal no negativo con hasta tres decimales y se devuelve como string o `null` (por ejemplo, `"2.5"`). No expresa stock disponible.

Los listados aceptan `page` (default 1), `pageSize` (default 20, máximo 100), `search` (texto parcial, insensible a mayúsculas) y `status`. Se ordenan por nombre y luego ID ascendentes. `search` busca nombre en todos los recursos y también SKU/barcode en productos. Respuesta: `{ "items": [...], "page": 1, "pageSize": 20, "total": 42 }`.

Cada item incluye `id`, `status`, `createdAt`, `updatedAt` y los campos del recurso de la tabla. Company incluye `name`, `taxId`, `businessType`; Branch incluye `companyId`, `name`, `address`; Category incluye `name`, `parentId`; Product incluye `categoryId`, `sku`, `barcode`, `name`, `description`, `unitOfMeasure`, `minStock`; Supplier incluye `name`, `taxId`, `email`, `phone`; Warehouse incluye `branchId`, `name`, `type`. La API puede incluir `tenantId` del contexto activo en la respuesta; el cliente compartido expone solo los campos tipados anteriores. Las funciones `listCompanies`, `getCompany`, `createCompany`, `updateCompany` y equivalentes de los otros recursos están en `@inventario/api-client`.

Company `taxId`, Product `sku`/`barcode` y Warehouse `name` por sucursal son únicos dentro del tenant aun si el registro está inactivo. Category `name` es único entre raíces del tenant y entre hijos del mismo padre; nombres de otro nivel o tenant pueden repetirse. La unicidad de nombres distingue mayúsculas. Una referencia nueva o cambiada debe apuntar a un padre activo del tenant activo. Categorías no pueden formar ciclos. Desactivar un padre no desactiva automáticamente los hijos ya existentes.

Errores: 400 payload, query o UUID inválidos; 401 falta/expiración de sesión; 403 falta tenant activo o permiso; 404 ID no visible, referencia ausente/inactiva o de otro tenant; 409 valor único duplicado. El backend aplica permisos sobre la sesión, nunca sobre valores enviados por el frontend.
