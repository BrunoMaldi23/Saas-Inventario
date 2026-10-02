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
