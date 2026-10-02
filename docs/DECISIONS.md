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
- Convencion final de cantidades en movimientos: signo unico o campos de direccion.
- Mecanismo futuro de activacion de modulos especializados por rubro.
