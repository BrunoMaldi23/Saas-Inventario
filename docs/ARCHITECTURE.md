# Arquitectura

## Objetivo arquitectonico

Construir un monorepo simple, modular y preparado para crecer, sin introducir complejidad prematura. La primera implementacion debe priorizar claridad, aislamiento multi-tenant y trazabilidad de inventario.

## Stack propuesto

- Monorepo: pnpm y Turborepo.
- Backend: NestJS, TypeScript, REST API.
- Frontend: React, Vite, TypeScript.
- Base de datos: PostgreSQL.
- ORM: Prisma.
- Validacion: DTOs y Zod donde aporte valor.
- Testing: Jest o Vitest segun aplicacion, Playwright para E2E web.
- Contenedores: Docker y Docker Compose cuando se inicie implementacion.
- Cache y jobs: Redis solo si aparece una necesidad real.

## Estructura objetivo

```text
InventarioSaaS/
  apps/
    api/
    web/
    worker/
  packages/
    types/
    validation/
    config/
    api-client/
  docs/
  infrastructure/
```

Durante Fase 0 no se crean aplicaciones ni paquetes. Esta estructura es una guia para fases posteriores.

## Implementacion de Fase 1

La fundacion tecnica incorpora `apps/api` (NestJS) y `apps/web` (React y Vite). No se crea `apps/worker`: se agregara cuando existan jobs reales. Los paquetes `types`, `validation`, `config` y `api-client` contienen, respectivamente, contratos de health, validacion de respuestas, validacion de entorno del servidor y consultas HTTP de health. PostgreSQL es el unico servicio de Compose. Redis permanece fuera de la implementacion segun DEC-007.

La API publica `GET /api/v1/health` para confirmar que el proceso responde y `GET /api/v1/health/database` para comprobar una consulta SQL minima; este ultimo devuelve 503 si PostgreSQL no responde. Vite proxifica `/api` hacia NestJS en desarrollo. `SystemMetadata` es una tabla tecnica global de conectividad, sin datos comerciales ni `tenantId`.

## Implementacion de Fase 2

NestJS usa guards globales en orden: comprobacion de origen para escrituras, autenticacion de sesion, resolucion de tenant activo y permiso requerido. Solo login y health son publicos. `me`, logout, listado de tenants y seleccion de tenant exigen sesion, pero no tenant activo. Toda ruta administrativa exige tenant activo y declara permiso; sin permiso declarado se deniega por defecto.

La sesion es un token aleatorio en cookie HTTP-only; PostgreSQL guarda solo su hash SHA-256 y expiracion. El login no selecciona tenant automaticamente. Cada request de tenant vuelve a comprobar usuario, tenant y membresia activos y obtiene permisos del rol asociado. Los contratos HTTP estan en `docs/API_CONTRACTS.md`; `apps/web` permanece bajo trabajo frontend paralelo.

## Implementacion de Fase 3

El catalogo operacional incorpora seis recursos REST: empresas, sucursales, categorias, productos, proveedores y bodegas. Sus controladores validan payloads y declaran permisos; `CatalogService` contiene las consultas, reglas de relacion y auditoria. Cada consulta se filtra por el tenant activo resuelto por los guards de Fase 2. Las claves foraneas compuestas impiden que sucursales, categorias, productos o bodegas apunten a registros de otro tenant, incluso si una escritura eludiera la API. No existen saldos ni movimientos de stock.

## Implementacion de Fase 4

`InventoryService` es el unico punto de escritura de balances y movimientos. Cada operacion valida producto y bodega activos del tenant, modifica `InventoryBalance` y crea `StockMovement` en una transaccion. Las salidas usan decremento condicional (`quantity >= cantidad`) para evitar saldos negativos bajo concurrencia; las entradas usan incremento atomico por clave unica. Las transferencias de un producto bloquean balances existentes en orden estable, descuentan origen, incrementan destino y crean dos movimientos dentro de una transaccion. Un error revierte toda la operacion. No se agregan Redis, jobs ni worker.

El cambio de contraseña usa la sesion autenticada sin requerir tenant activo; verifica la contraseña actual, actualiza Argon2id, revoca otras sesiones y audita en una transaccion. La sesion actual conserva su expiracion original.

## Principios de diseno

- Modularidad por dominio funcional.
- Controladores delgados y logica de negocio en servicios.
- REST API inicialmente, evitando GraphQL hasta que exista una necesidad clara.
- Un solo backend modular antes de considerar microservicios.
- Dependencias compartidas solo cuando reduzcan duplicacion real.
- Todo dato comercial debe estar aislado por tenant.
- El tenant se obtiene desde el contexto autenticado, no desde valores libres enviados por el frontend.

## Capas propuestas

- UI web: pantallas, formularios, estados de carga, errores y navegacion.
- API: controladores, guards, validacion, autorizacion y serializacion.
- Servicios de dominio: reglas de negocio por modulo.
- Acceso a datos: Prisma como capa de persistencia.
- Base de datos: PostgreSQL con restricciones, indices y relaciones claras.

## Modulos backend iniciales

- AuthModule.
- TenantsModule.
- CompaniesModule.
- BranchesModule.
- UsersModule.
- RolesModule.
- ProductsModule.
- CategoriesModule.
- SuppliersModule.
- WarehousesModule.
- InventoryModule.
- StockMovementsModule.
- AlertsModule.
- ReportsModule.
- AuditModule.

## Multi-tenancy

Modelo recomendado inicial: base de datos compartida con columna `tenantId` en todas las tablas comerciales.

Motivos:

- Es simple para una primera version SaaS.
- Reduce costo operativo inicial.
- Permite mantener un unico esquema.
- Facilita reportes internos por tenant con controles estrictos.

Reglas obligatorias:

- Toda entidad comercial debe tener `tenantId`.
- Toda consulta sensible debe filtrar por `tenantId`.
- Toda escritura debe asignar `tenantId` desde el usuario autenticado.
- No se debe aceptar `tenantId` arbitrario desde el frontend para operar datos comerciales.
- Las restricciones unicas deben estar scoped por `tenantId`.
- El superadmin SaaS debe usar flujos separados y auditados.

## Estrategia de autenticacion

La primera version debe usar autenticacion propia simple:

- Email y password.
- Password minimo de 8 caracteres.
- Password hasheado con Argon2id.
- Sesion web mediante cookies HTTP-only.
- Cookies `Secure` en produccion y `SameSite` adecuado al flujo web.
- Sin OAuth ni proveedores externos inicialmente.
- Refresh token solo si se justifica por experiencia de usuario y manteniendo cookies HTTP-only.
- Recuperacion de password en fase posterior si no bloquea el MVP.

La sesion debe identificar al usuario y el tenant activo. Un usuario puede pertenecer a multiples tenants mediante `TenantMembership`, pero cada operacion debe ejecutarse bajo un tenant activo claramente definido. El backend debe resolver permisos desde datos confiables del servidor.

## Estrategia RBAC

RBAC inicial por roles predefinidos:

- Owner: control total del tenant.
- Admin: administra operacion, usuarios y configuracion no critica.
- InventoryManager: administra productos, stock y movimientos.
- BranchManager: opera una o mas sucursales asignadas.
- Viewer: lectura de datos permitidos.

Los permisos deben expresarse como acciones por modulo, por ejemplo `products:create`, `inventory:adjust` o `users:invite`.

El control inicial por sucursal sera basico y se apoyara primero en el tenant activo. El modelo debe permitir asignaciones por sucursal en una fase posterior, sin implementar RBAC complejo por sucursal en el inicio.

## Inventario y trazabilidad

El stock actual debe derivar de movimientos registrados y mantenerse como saldo operacional para consultas rapidas. Cada cambio de stock debe generar un movimiento auditable.

Tipos iniciales de movimiento:

- InitialStock.
- PurchaseReceipt.
- SaleIssue.
- ManualAdjustment.
- TransferOut.
- TransferIn.
- StockCountCorrection.

Reglas:

- No modificar stock sin movimiento asociado.
- Prohibir stock negativo por defecto.
- Preparar la arquitectura para que el stock negativo pueda ser configurable por tenant en una fase futura, sin implementar aun esa configuracion.
- Los ajustes requieren motivo.
- Las transferencias generan salida en origen y entrada en destino.
- Los movimientos deben guardar usuario, fecha, producto, bodega, cantidad, tipo y referencia opcional.
- Las cantidades deben usar convencion clara de signos o campos de entrada/salida, definida antes de implementar.

## Riesgos tecnicos

- Fugas de datos entre tenants por filtros incompletos.
- Modelo de inventario demasiado simple para rubros con lotes, series o vencimientos.
- Permisos insuficientemente granulares para empresas con varias sucursales.
- Reportes lentos si no se definen indices desde el inicio.
- Acoplar reglas especificas de rubro al nucleo comun.
- Subestimar auditoria para ajustes de stock.

## Decisiones pendientes

- Recuperacion de password en MVP o fase posterior.
- Mecanismo futuro de activacion de modulos especializados por rubro.

## Endurecimiento de contratos (Fase 4.1)

Las respuestas de catálogo, movimientos y transferencias agregan resúmenes de relaciones mediante `include/select` en la misma consulta Prisma, manteniendo el filtro de tenant de la entidad principal y sin cargas N+1. Los listados mantienen los campos de paginación existentes y agregan `totalPages`. `@inventario/api-client` centraliza los errores HTTP en `ApiError` con status numérico; una falla de red usa status 0. La API permite asociar por email exacto un usuario activo existente a un tenant solo con `memberships:manage`; no ofrece directorio ni búsqueda parcial.
