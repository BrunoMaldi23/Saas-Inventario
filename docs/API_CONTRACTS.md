# Contratos API de identidad, catálogo e inventario (Fases 2–4)

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
| `POST /memberships/by-email`    | `{ "email": "user@example.com", "roleId": "UUID" }`                                      | `MembershipView`, 201                              | `memberships:manage` |
| `PATCH /memberships/:id/role`   | `{ "roleId": "UUID" }`                                                                   | `MembershipView`                                   | `memberships:manage` |
| `PATCH /memberships/:id/status` | `{ "status": "ACTIVE" o "INACTIVE" }`                                                    | `MembershipView`                                   | `memberships:manage` |

`MembershipView` contiene `{ id, user: UserSummary, role: { id, name }, status }`. `POST /users` crea una identidad nueva y su primera membresía; si el email global ya existe, responde 409. `POST /memberships` asocia por `userId` una identidad ya existente. `POST /memberships/by-email` busca una coincidencia exacta de email (normalizada a minúsculas) entre usuarios activos y asocia esa identidad al tenant activo. No existe directorio ni búsqueda parcial/global. Un usuario inexistente o inactivo devuelve 404 `User not found`; una membresía duplicada devuelve 409. Ambas rutas requieren sesión, tenant activo y `memberships:manage`; cada alta se audita como `MEMBERSHIP_CREATED`. Owner administra todas las membresías. Admin puede crear y modificar usuarios con roles InventoryManager, BranchManager y Viewer, sin asignar ni modificar Owner o Admin. InventoryManager, BranchManager y Viewer no tienen permisos de identidad.

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

Los listados aceptan `page` (default 1), `pageSize` (default 20, máximo 100), `search` (texto parcial, insensible a mayúsculas) y `status`. Se ordenan por nombre y luego ID ascendentes. `search` busca nombre en todos los recursos y también SKU/barcode en productos. Respuesta: `{ "items": [...], "page": 1, "pageSize": 20, "total": 42, "totalPages": 3 }`; `totalPages` es `ceil(total / pageSize)` (0 si no hay resultados).

Cada item incluye `id`, `status`, `createdAt`, `updatedAt` y los campos del recurso de la tabla. Company incluye `name`, `taxId`, `businessType`; Branch incluye `companyId`, `name`, `address` y `company: { id, name }`; Category incluye `name`, `parentId` y `parent: { id, name } | null`; Product incluye `categoryId`, `sku`, `barcode`, `name`, `description`, `unitOfMeasure`, `minStock` y `category: { id, name } | null`; Supplier incluye `name`, `taxId`, `email`, `phone`; Warehouse incluye `branchId`, `name`, `type` y `branch: { id, name }`. Las referencias son resúmenes obtenidos en la misma consulta Prisma. La API puede incluir `tenantId` del contexto activo en la respuesta; el cliente compartido expone solo los campos tipados anteriores. Las funciones `listCompanies`, `getCompany`, `createCompany`, `updateCompany` y equivalentes de los otros recursos están en `@inventario/api-client`.

Company `taxId`, Product `sku`/`barcode` y Warehouse `name` por sucursal son únicos dentro del tenant aun si el registro está inactivo. Category `name` es único entre raíces del tenant y entre hijos del mismo padre; nombres de otro nivel o tenant pueden repetirse. La unicidad de nombres distingue mayúsculas. Una referencia nueva o cambiada debe apuntar a un padre activo del tenant activo. Categorías no pueden formar ciclos. Desactivar un padre no desactiva automáticamente los hijos ya existentes.

Errores: 400 payload, query o UUID inválidos; 401 falta/expiración de sesión; 403 falta tenant activo o permiso; 404 ID no visible, referencia ausente/inactiva o de otro tenant; 409 valor único duplicado. El backend aplica permisos sobre la sesión, nunca sobre valores enviados por el frontend.

## Cambio de contraseña autenticado

`POST /api/v1/auth/change-password` requiere sesión, pero no tenant activo ni permiso de catálogo. Request: `{ "currentPassword": "...", "newPassword": "mínimo 8 caracteres" }`; response 204 sin body. La contraseña nueva admite hasta 1024 caracteres. Una contraseña actual incorrecta devuelve 401 `Invalid credentials`; un body inválido devuelve 400. La sesión actual permanece activa con su vencimiento original; las demás sesiones del usuario se revocan. Nunca se devuelve ni registra el hash o las contraseñas. No se implementa recuperación de contraseña. `ChangePasswordRequest`, `changePasswordRequestSchema` y `changePassword(input)` están publicados en los tres paquetes compartidos.

## Errores HTTP y cliente

`@inventario/api-client` lanza `ApiError` para respuestas HTTP no exitosas. Expone `status`, `message`, `code?` y `details?`; el status nunca debe inferirse desde el texto. NestJS responde con su formato `{ statusCode, message, error }`; el cliente usa `statusCode` HTTP como fuente de verdad y no convierte mensajes 5xx del servidor en texto visible, para evitar filtrar detalles internos. Para fallos de red lanza `ApiError` con `status: 0`, `code: "NETWORK_ERROR"` y un mensaje genérico. Los statuses usados son 400 (validación), 401 (sesión/credenciales), 403 (tenant/permisos/origen), 404 (recurso no visible), 409 (conflicto), 422 (no usado actualmente) y 500 (error interno). `details` solo se propaga si viene explícitamente en el envelope estructurado.

## Inventario y movimientos (Fase 4)

Todas las rutas siguientes requieren sesión y tenant activo. `tenantId` se obtiene exclusivamente del contexto autenticado y se rechaza en payloads. Las cantidades son strings decimales **positivos**, con hasta tres decimales; `direction` indica `IN` o `OUT`. Un balance ausente equivale a cero para una salida. No existe endpoint para asignar directamente el saldo.

| Método y ruta | Body / query | Respuesta | Permiso |
| --- | --- | --- | --- |
| `GET /inventory` | `page`, `pageSize`, `productId`, `warehouseId`, `lowStock` | `CatalogPage<InventoryBalanceView>` | `inventory:read` |
| `GET /inventory/movements` | `page`, `pageSize`, `productId`, `warehouseId`, `type`, `from`, `to`, `createdByUserId` | `CatalogPage<StockMovementView>` | `inventory:read` |
| `POST /inventory/initial-stock` | `StockOperationRequest` | `StockOperationResponse`, 201 | `inventory:write` |
| `POST /inventory/entries` | `StockOperationRequest` | `StockOperationResponse`, 201 | `inventory:write` |
| `POST /inventory/issues` | `StockOperationRequest` | `StockOperationResponse`, 201 | `inventory:write` |
| `POST /inventory/adjustments` | `StockAdjustmentRequest` | `StockOperationResponse`, 201 | `inventory:adjust` |
| `GET /transfers` | `page`, `pageSize`, `productId` | `CatalogPage<StockTransferView>` | `inventory:read` |
| `GET /transfers/:id` | — | `StockTransferView` | `inventory:read` |
| `POST /transfers` | `StockTransferRequest` | `StockTransferResponse`, 201 | `inventory:transfer` |

`StockOperationRequest` contiene `{ productId, warehouseId, quantity, reason? }`. Stock inicial crea el primer balance de ese par producto-bodega; repetirlo responde 409. Entrada incrementa y salida decrementa. `StockAdjustmentRequest` agrega `direction` y exige `reason` no vacío (máximo 500 caracteres); ajusta por una diferencia, no fija un saldo absoluto. `StockTransferRequest` contiene `{ productId, fromWarehouseId, toWarehouseId, quantity, reason? }`; origen y destino deben diferir. Cada transferencia mueve un solo producto y se completa de forma atómica, con movimientos `TRANSFER/OUT` y `TRANSFER/IN` vinculados por `transferId`. No hay estado pendiente.

`InventoryBalanceView` contiene `id`, `productId`, `warehouseId`, `quantity`, `product: { id, name, sku, minStock }`, `warehouse: { id, name }`, `createdAt` y `updatedAt`. `StockMovementView` contiene `id`, `productId`, `warehouseId`, `transferId` nullable, `type` (`INITIAL`, `ENTRY`, `ISSUE`, `ADJUSTMENT`, `TRANSFER`), `direction`, `quantity`, `reason` nullable, `createdByUserId`, `product: { id, name, sku }`, `warehouse: { id, name }`, `actor: { id, name }` y `createdAt`. `StockTransferView` contiene `id`, `productId`, `fromWarehouseId`, `toWarehouseId`, `quantity`, `status: "COMPLETED"`, `reason` nullable, `createdByUserId`, `createdAt`, `completedAt`, `product: { id, name, sku }`, `fromWarehouse: { id, name }`, `toWarehouse: { id, name }` y `actor: { id, name }`. Son resúmenes de una sola consulta y quedan restringidos al tenant consultado. Cada transferencia mueve un único producto; no acepta una colección de items. `StockOperationResponse` es `{ balance, movement }`; `StockTransferResponse` es `{ transfer, source, destination, movements: [salida, entrada] }`. Fechas usan ISO 8601 y cantidades son strings.

La paginación de catálogos, balances, movimientos y transferencias usa `{ items, page, pageSize, total, totalPages }`; comienza en `page=1`, `pageSize=20` por defecto y limita `pageSize` a 100. Los movimientos y transferencias se ordenan por fecha e ID descendentes. `from` y `to` son fechas ISO 8601 con zona; ambos extremos son inclusivos. `lowStock=true` en `GET /inventory` devuelve balances **existentes** cuya cantidad es menor o igual que `Product.minStock` cuando está configurado. No genera notificaciones ni incluye productos sin fila de balance.

Owner, Admin e InventoryManager tienen los cuatro permisos. BranchManager tiene lectura, escritura y transferencia, sin ajuste. Viewer solo lectura. Un producto, bodega o padre operativo inactivo no puede usarse en nuevas operaciones. Errores principales: 400 payload o query inválidos; 401 sin sesión; 403 sin tenant o permiso; 404 producto/bodega/transferencia no visible; 409 stock insuficiente o stock inicial ya existente. Los permisos nunca se toman del frontend.

`@inventario/types`, `@inventario/validation` y `@inventario/api-client` exportan estos contratos y funciones `listInventory`, `listMovements`, `recordInitialStock`, `recordEntry`, `recordIssue`, `recordAdjustment`, `listTransfers`, `getTransfer` y `createTransfer`.
