# Decisiones

## Estado

Este documento registra decisiones iniciales de Fase 0. La Fase 0 queda formalmente cerrada cuando estas decisiones estan aceptadas y reflejadas en la documentacion. Las decisiones pueden cambiar si aparecen requisitos nuevos, pero deben modificarse explicitamente.

## DEC-001: Monorepo modular

Decision: usar monorepo con pnpm y Turborepo cuando comience la implementacion.

Motivo:

- Facilita compartir tipos, validaciones y cliente API.
- Mantiene frontend, backend y paquetes comunes coordinados.
- Es coherente con AGENTS.md.

Alternativa descartada:

- Repos separados desde el inicio, por mayor costo operativo inicial.

## DEC-002: Backend modular unico

Decision: iniciar con un backend NestJS modular, no microservicios.

Motivo:

- Reduce complejidad.
- Permite separar dominios sin costos de distribucion.
- Es suficiente para una primera version SaaS.

Alternativa descartada:

- Microservicios por modulo.

## DEC-003: REST API inicial

Decision: exponer API REST inicialmente.

Motivo:

- Es simple, conocida y suficiente para CRUD, inventario y reportes basicos.
- Reduce decisiones prematuras.

Alternativa descartada:

- GraphQL desde el inicio.

## DEC-004: Multi-tenancy por columna tenantId

Decision: usar base de datos compartida con `tenantId` en tablas comerciales.

Motivo:

- Menor complejidad operativa.
- Buen equilibrio para MVP.
- Permite restricciones e indices scoped por tenant.

Condicion:

- Se deben aplicar filtros, validaciones y pruebas multi-tenant estrictas.

Alternativas descartadas:

- Una base de datos por tenant.
- Un schema por tenant.

## DEC-005: Inventario basado en movimientos

Decision: todo cambio de stock debe registrarse como movimiento.

Motivo:

- Entrega trazabilidad.
- Permite auditoria.
- Reduce inconsistencias invisibles.

Condicion:

- Puede existir tabla de saldos para consulta rapida, pero no debe ser modificada sin movimiento asociado.

## DEC-006: Especializacion por rubro posterior

Decision: no modelar en Fase 0 todas las reglas particulares de botillerias, farmacias, supermercados, ferreterias y distribuidoras.

Motivo:

- El nucleo comun debe validarse primero.
- Evita duplicacion y sobrearquitectura.

Ejemplos futuros:

- Lotes y vencimientos.
- Unidades avanzadas.
- Packs.
- Retornables.
- Listas de precio.

## DEC-007: Redis no se usa inicialmente

Decision: Redis queda fuera de la fase inicial salvo que aparezca una necesidad concreta.

Motivo:

- No hay aun jobs, cache o colas justificadas.
- Evita dependencia operativa prematura.

## DEC-008: Documentacion antes de codigo

Decision: Fase 0 solo crea documentacion y planificacion.

Motivo:

- Permite alinear producto, negocio y arquitectura.
- Reduce retrabajo antes de crear aplicaciones.

## DEC-009: Autenticacion web con cookies HTTP-only

Decision: usar cookies HTTP-only para la autenticacion web.

Condiciones:

- Cookies `Secure` en produccion.
- `SameSite` adecuado al flujo web.
- Autenticacion simple con email y password.
- No implementar OAuth ni proveedores externos inicialmente.

Motivo:

- Reduce exposicion de tokens en JavaScript.
- Mantiene simple el alcance inicial.
- Es suficiente para un SaaS web en primera etapa.

## DEC-010: Passwords con Argon2id

Decision: exigir minimo 8 caracteres inicialmente y almacenar passwords solo como hash Argon2id.

Condiciones:

- Nunca almacenar passwords en texto plano.
- Nunca registrar passwords en logs.
- Los mensajes de error no deben facilitar enumeracion de usuarios.

Motivo:

- Entrega una base segura sin complejidad excesiva.
- Permite endurecer politicas en fases futuras.

## DEC-011: Usuarios multi-tenant con TenantMembership

Decision: un mismo usuario puede pertenecer a multiples tenants mediante `TenantMembership`.

Condiciones:

- El usuario debe operar bajo un tenant activo claramente definido.
- Los permisos se resuelven desde la membresia del tenant activo.
- No se aceptara `tenantId` libre desde frontend para operar datos comerciales.

Motivo:

- Soporta usuarios que administran mas de una empresa o cuenta.
- Mantiene separada la identidad global de la pertenencia operacional.

## DEC-012: Stock negativo prohibido por defecto

Decision: prohibir stock negativo en la fase inicial.

Condiciones:

- Ningun movimiento debe dejar saldo negativo.
- La arquitectura debe permitir hacerlo configurable por tenant en una fase futura.
- No se implementa aun la configuracion por tenant.

Motivo:

- Reduce errores operacionales en el MVP.
- Mantiene reglas simples y trazables.

## DEC-013: Control inicial por tenant, preparacion por sucursal

Decision: comenzar con control de acceso basico por tenant.

Condiciones:

- El modelo debe permitir asignaciones por sucursal en el futuro.
- No se implementara RBAC complejo por sucursal inicialmente.

Motivo:

- Evita complejidad temprana.
- Permite operar empresas simples y preparar crecimiento.

## DEC-014: Primera especializacion como inventario generico

Decision: el nucleo inicial sera inventario generico y bodega.

Condiciones:

- Farmacia, botilleria, supermercado y otros rubros seran extensiones posteriores.
- Las extensiones no deben duplicar el nucleo comun.

Motivo:

- Valida primero el flujo base de catalogo, stock y movimientos.
- Evita acoplar reglas especificas al nucleo.

## Cierre de Fase 0

Fase 0 queda cerrada formalmente con estas decisiones documentadas. No se inicia Fase 1 en este cierre.

## Decisiones pendientes

- Necesidad de refresh token en MVP.
- Recuperacion de password en MVP o fase posterior.
- Mecanismo futuro de activacion de modulos especializados por rubro.

## DEC-015: Fundacion tecnica de Fase 1

Decision: usar PostgreSQL 16 en Compose, Prisma 6 con un unico cliente generado en la raiz del monorepo, y una tabla tecnica global `SystemMetadata`. La API expone health separado para proceso y base de datos; la web consulta ambos a traves del proxy de Vite en desarrollo.

Motivo: permite verificar instalacion, migraciones y conectividad extremo a extremo sin introducir modelos comerciales ni servicios adicionales. Prisma Client se genera en la raiz para evitar copias divergentes entre paquetes pnpm. El puerto local de PostgreSQL es configurable y el ejemplo usa 55432 para evitar conflictos con servidores locales en 5432.

Ajuste tecnico de Fase 2: la generacion se ejecuta explicitamente con `pnpm db:generate` tras instalar o cambiar el schema, y en CI antes de los checks. La generacion automatica en cada `pnpm install` fallaba en Windows cuando una API en desarrollo mantenia abierto el binario de Prisma. La API debe detenerse antes de regenerar el cliente.

## DEC-016: Sesiones persistidas y tenant explicito

Decision: sesion opaca aleatoria en cookie HTTP-only con expiracion de 8 horas y hash del token persistido en PostgreSQL. Login deja `activeTenantId` vacio; `select-tenant` solo acepta tenants con membresia activa. Cada ruta de tenant revalida la membresia y permisos en backend.

Motivo: permite revocar en logout y reflejar de inmediato cambios de membresia sin Redis ni JWT accesible a JavaScript. No se necesita refresh token en esta fase.

## DEC-017: RBAC inicial y bootstrap

Decision: roles por tenant con permisos globales relacionados por `RolePermission`. Se crean los cinco roles aprobados al ejecutar explicitamente `pnpm db:bootstrap` con credenciales locales; no existe endpoint publico de alta de tenants. Owner gestiona todas las identidades; Admin puede gestionar usuarios con roles InventoryManager, BranchManager o Viewer, sin asignar ni modificar Owner o Admin. Se impide retirar al ultimo Owner activo.

Motivo: mantiene permisos en la base y evita escalacion desde el frontend. La asociacion de una identidad existente a otro tenant usa `userId` conocido por el administrador; invitaciones y consentimiento quedan para una fase posterior si el producto los requiere.

## DEC-018: Proteccion de escrituras con cookie

Decision: `SameSite=Lax`, cookie host-only y comprobacion del origen de escrituras en la API, usando el mismo origen web/API. `Secure` se activa en produccion. No se habilita CORS cross-origin en Fase 2.

Motivo: una cookie de sesion requiere proteccion CSRF; la comprobacion de origen complementa `SameSite` sin introducir un servicio ni token adicional en esta fase.

## DEC-019: Catalogo operacional sin borrado fisico

Decision: seis recursos de catalogo usan GET de lista/detalle, POST y PATCH; no exponen DELETE. `INACTIVE` mantiene trazabilidad y unicidad. Los listados incluyen ambos estados por defecto y permiten filtrar. Una nueva referencia o reasignacion solo apunta a padres activos; desactivar un padre no cambia automaticamente sus hijos.

Motivo: evita eliminar referencias necesarias para inventario futuro sin introducir cascadas ni automatismos prematuros.

## DEC-020: Identificadores y cantidades de catalogo

Decision: SKU se normaliza a mayusculas y es unico por tenant; barcode y taxId se conservan como texto y son unicos por tenant cuando existen. Nombres de categorias son unicos entre hermanos, incluidas las raices, mediante indices parciales en PostgreSQL. `minStock` es decimal no negativo de tres decimales y su contrato HTTP usa string; no es saldo actual.

Motivo: evita ambiguedad de `NULL` en categorias raiz y perdida de precision en cantidades, manteniendo contratos simples.

## DEC-021: Permisos de catalogo

Decision: Owner y Admin leen y escriben los seis recursos; Viewer solo lee. InventoryManager escribe categorias, productos, proveedores y bodegas; BranchManager escribe productos, proveedores y bodegas. Los dos roles operativos leen los seis recursos. La migracion asigna estos permisos a tenants existentes; el bootstrap los asigna a tenants nuevos.

Motivo: cubre operaciones iniciales sin crear administracion configurable de roles ni autorizacion por sucursal en esta fase.

## DEC-022: Cambio de contraseña autenticado

Decision: exigir la contraseña actual y una nueva de al menos 8 caracteres. Actualizar el hash Argon2id, revocar todas las demas sesiones y auditar `PASSWORD_CHANGED` en una transaccion. La sesion que realiza el cambio permanece activa con su vencimiento original. No se implementa recuperacion de contraseña.

Motivo: permite actualizar credenciales desde Perfil sin exponer hashes ni mantener sesiones antiguas activas.

## DEC-023: Convencion de cantidades de inventario

Decision: `quantity` en cada movimiento y transferencia es estrictamente positiva, con hasta tres decimales. `direction` (`IN`/`OUT`) indica el efecto sobre el saldo; `type` describe la causa (`INITIAL`, `ENTRY`, `ISSUE`, `ADJUSTMENT`, `TRANSFER`). El saldo es un decimal no negativo. Un ajuste manual expresa incremento o decremento mediante direccion y requiere motivo; no asigna un saldo absoluto.

Motivo: evita mezclar signos y permite reconstruir el saldo desde movimientos sin ambiguedad. `InventoryBalance` es una proyeccion transaccional para consultas, nunca se modifica por un endpoint de asignacion directa.

## DEC-024: Concurrencia y transferencia atomica

Decision: usar transacciones Prisma/PostgreSQL. Para salidas, ajustes negativos y origen de transferencias, efectuar un `UPDATE` condicional con `quantity >= cantidad` y decremento atomico; si no actualiza una fila, rechazar la operacion. Para entradas usar incremento atomico por clave unica de balance. Las transferencias bloquean los balances existentes en orden estable para evitar deadlocks entre direcciones opuestas. Cada transferencia de Fase 4 mueve un producto entre dos bodegas, crea dos movimientos y se completa en una sola transaccion. No hay transferencias pendientes ni configuracion de stock negativo.

Motivo: el bloqueo de fila implicito del `UPDATE` condicional evita doble descuento y saldos negativos bajo concurrencia, sin Redis ni bloqueo distribuido. La clave unica `(tenantId, warehouseId, productId)` impide saldos duplicados.
