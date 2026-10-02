# Base de datos

## Objetivo

Definir un modelo conceptual inicial para PostgreSQL que soporte multi-tenancy, catalogo de productos, bodegas, stock y movimientos trazables. Este documento no define aun un schema Prisma definitivo.

## Reglas generales

- Usar UUID para IDs principales.
- Incluir `createdAt` y `updatedAt` en entidades principales.
- Incluir `tenantId` en toda entidad comercial.
- Crear indices para consultas frecuentes.
- Scopear restricciones unicas por `tenantId`.
- Evitar relaciones ambiguas.
- No depender solo de validaciones de frontend.

## Modelos implementados en Fase 2

`User` es identidad global con email unico normalizado en backend, `passwordHash` Argon2id y estado. `Tenant` es la cuenta aislada. `TenantMembership` une usuario, tenant y rol, con unicidad `(tenantId, userId)`; la relacion compuesta `(roleId, tenantId)` impide asignar un rol de otro tenant. `Role` es propio de un tenant y tiene nombre unico por tenant. `Permission` contiene claves globales; `RolePermission` las asigna a roles. Los roles iniciales son Owner, Admin, InventoryManager, BranchManager y Viewer.

`Session` guarda hash del token, usuario, tenant activo opcional y expiracion. `AuditLog` guarda actor, accion, entidad, tenant opcional (login antes de seleccionar tenant) y detalles sin secrets. Las acciones iniciales son LOGIN, LOGOUT, TENANT_SELECTED, USER_CREATED, MEMBERSHIP_CREATED, ROLE_CHANGED y MEMBERSHIP_STATUS_CHANGED. La migracion `20261002130910_identity_access` crea restricciones e indices para usuarios, membresias, sesiones y auditoria.

`SystemMetadata` permanece global y tecnica. No se crean entidades comerciales en esta fase. La preparacion conceptual por sucursal sigue pendiente y no se agregan campos de sucursal sin flujo real.

## Modelos implementados en Fase 3

`Company`, `Branch`, `Category`, `Product`, `Supplier` y `Warehouse` tienen UUID, `tenantId`, `status`, `createdAt` y `updatedAt`. No hay borrado HTTP: `INACTIVE` conserva los registros y sus claves unicas. Los listados incluyen ambos estados por defecto y aceptan filtro de estado. Una nueva relacion, o una reasignacion, solo puede apuntar a un registro activo del mismo tenant; desactivar un padre no cambia automaticamente el estado de los hijos ya existentes.

La migracion `20261002140355_operational_catalog` agrega claves foraneas compuestas `(id, tenantId)` para Company→Branch, Category→Category/Product y Branch→Warehouse. SKU y barcode son unicos por tenant cuando existen; SKU se normaliza a mayusculas. `Company.taxId` es unico por tenant cuando existe; `Warehouse.name` es unico por tenant y sucursal. Dos indices parciales de PostgreSQL hacen unico `Category.name` entre raices del mismo tenant y entre hijos del mismo padre. Los nombres son sensibles a mayusculas para unicidad. `Product.minStock` es decimal no negativo de precision 18,3 y se comunica como string; no representa stock actual. La migracion agrega permisos del catalogo a roles de tenants existentes.

## Entidades conceptuales

### Tenant

Representa una cuenta SaaS aislada.

Campos conceptuales:

- id.
- name.
- status.
- plan.
- createdAt.
- updatedAt.

### Company

Representa la empresa principal o razon comercial del tenant.

Campos conceptuales:

- id.
- tenantId.
- name.
- taxId.
- businessType.
- createdAt.
- updatedAt.

Regla: `taxId` debe ser unico por tenant si se permite mas de una empresa.

### Branch

Representa una sucursal, local o punto operativo.

Campos conceptuales:

- id.
- tenantId.
- companyId.
- name.
- address.
- status.
- createdAt.
- updatedAt.

### User

Representa una identidad de acceso.

Campos conceptuales:

- id.
- email.
- passwordHash.
- name.
- status.
- createdAt.
- updatedAt.

Regla adoptada: un mismo usuario puede pertenecer a multiples tenants mediante `TenantMembership`. El email identifica al usuario y la pertenencia operacional se resuelve por membresia y tenant activo.

### TenantMembership

Relaciona usuarios con tenants.

Campos conceptuales:

- id.
- tenantId.
- userId.
- roleId.
- activeBranchId opcional para preparacion futura.
- status.
- createdAt.
- updatedAt.

Reglas:

- Un usuario no debe tener membresias duplicadas activas para el mismo tenant.
- Cada operacion autenticada debe ejecutarse bajo un tenant activo derivado de una membresia valida.
- El modelo debe permitir asignaciones por sucursal en una fase futura sin requerir RBAC complejo por sucursal desde el inicio.

### Role

Define un rol dentro de un tenant o rol predefinido del sistema.

Campos conceptuales:

- id.
- tenantId opcional para roles personalizados futuros.
- name.
- permissions.
- createdAt.
- updatedAt.

### Category

Clasifica productos.

Campos conceptuales:

- id.
- tenantId.
- name.
- parentId opcional.
- createdAt.
- updatedAt.

Regla: nombre unico por tenant y nivel cuando corresponda.

### Product

Producto comun del catalogo.

Campos conceptuales:

- id.
- tenantId.
- categoryId.
- sku.
- barcode.
- name.
- description.
- unitOfMeasure.
- status.
- minStock opcional.
- createdAt.
- updatedAt.

Reglas:

- `sku` unico por tenant cuando exista.
- `barcode` unico por tenant cuando exista.
- El producto no debe guardar stock total como fuente unica de verdad.

### Supplier

Proveedor del tenant.

Campos conceptuales:

- id.
- tenantId.
- name.
- taxId.
- email.
- phone.
- status.
- createdAt.
- updatedAt.

### Warehouse

Bodega, sala de venta o ubicacion de stock.

Campos conceptuales:

- id.
- tenantId.
- branchId.
- name.
- type.
- status.
- createdAt.
- updatedAt.

Regla: nombre unico por sucursal dentro del tenant.

### InventoryBalance

Saldo actual por producto y bodega.

Campos conceptuales:

- id.
- tenantId.
- warehouseId.
- productId.
- quantity.
- updatedAt.

Reglas:

- Combinacion unica `tenantId`, `warehouseId`, `productId`.
- El saldo no puede quedar negativo por defecto.
- La arquitectura debe permitir configurar esta regla por tenant en una fase futura, pero esa configuracion no se implementa inicialmente.

### StockMovement

Registro trazable de cada cambio de stock.

Campos conceptuales:

- id.
- tenantId.
- warehouseId.
- productId.
- type.
- quantity.
- direction.
- reason.
- referenceType.
- referenceId.
- createdByUserId.
- createdAt.

Reglas:

- Todo cambio de stock crea un movimiento.
- Los ajustes manuales requieren motivo.
- La cantidad debe ser positiva y la direccion define entrada o salida, o se debe usar una convencion unica de signos. La decision final debe tomarse antes de implementar.
- Ningun movimiento debe dejar saldo negativo en la fase inicial.

### StockTransfer

Agrupa movimientos de transferencia entre bodegas.

Campos conceptuales:

- id.
- tenantId.
- fromWarehouseId.
- toWarehouseId.
- status.
- createdByUserId.
- createdAt.
- completedAt.

Regla: origen y destino deben pertenecer al mismo tenant.

### AuditLog

Registro de acciones sensibles.

Campos conceptuales:

- id.
- tenantId.
- actorUserId.
- action.
- entityType.
- entityId.
- metadata.
- createdAt.

## Indices iniciales recomendados

- `tenantId` en entidades comerciales.
- `tenantId`, `sku` en productos.
- `tenantId`, `barcode` en productos.
- `tenantId`, `warehouseId`, `productId` en saldos.
- `tenantId`, `productId`, `createdAt` en movimientos.
- `tenantId`, `warehouseId`, `createdAt` en movimientos.
- `tenantId`, `actorUserId`, `createdAt` en auditoria.

## Consideraciones futuras

- Lotes y vencimientos.
- Numeros de serie.
- Unidades de medida compuestas.
- Costeo de inventario.
- Precios y listas de precio.
- Documentos comerciales.
- Configuracion por tenant para permitir stock negativo.
- Asignaciones y permisos por sucursal.
