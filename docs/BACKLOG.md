# Backlog

## Criterio de priorizacion

Priorizar primero el nucleo multi-tenant, seguridad basica, modelo de inventario y trazabilidad. Las funcionalidades especificas por rubro deben esperar hasta que el nucleo comun sea estable.

## Fase 0: Definicion y planificacion

Objetivo: dejar acordado que se construira, que no se construira todavia y bajo que reglas tecnicas.

Tareas:

- Definir vision del producto.
- Identificar usuarios principales.
- Definir alcance inicial y fuera de alcance.
- Definir modulos core.
- Definir reglas multi-tenant.
- Definir arquitectura propuesta.
- Definir modelo conceptual inicial de datos.
- Definir estrategia de autenticacion y RBAC.
- Definir estrategia de inventario y trazabilidad.
- Definir estrategia de pruebas.
- Registrar decisiones iniciales.

Criterios de aceptacion:

- Documentos de producto, arquitectura, datos, seguridad, pruebas, backlog y decisiones creados.
- Decisiones de autenticacion, passwords, usuarios multi-tenant, stock negativo, sucursales y primera especializacion adoptadas.
- No existe codigo de aplicaciones, Prisma, Docker ni CI creado en esta fase.
- Las decisiones son simples, revisables y coherentes con AGENTS.md.
- Fase 0 cerrada formalmente antes de iniciar Fase 1.

Estado: cerrada formalmente.

## Fase 1: Fundacion tecnica

Objetivo: crear la base del monorepo y aplicaciones minimas.

Tareas candidatas:

- Inicializar monorepo con pnpm y Turborepo.
- Crear `apps/api` con NestJS.
- Crear `apps/web` con React, Vite y TypeScript.
- Crear configuracion base de TypeScript.
- Crear gestion centralizada de variables de entorno.
- Crear Docker Compose local para PostgreSQL solo cuando se inicie implementacion.
- Crear pipeline basico de checks cuando exista codigo.

## Fase 2: Identidad y multi-tenancy

Objetivo: autenticar usuarios y aislar tenants.

Tareas candidatas:

- Crear modelo de tenants, usuarios, roles y membresias.
- Implementar login.
- Implementar sesiones web con cookies HTTP-only.
- Implementar contexto autenticado.
- Implementar guard de tenant.
- Implementar permisos RBAC basicos.
- Implementar `TenantMembership` para usuarios con multiples tenants.
- Crear auditoria basica para eventos sensibles.
- Probar aislamiento entre tenants.

## Fase 3: Catalogo operacional

Objetivo: administrar datos maestros del inventario.

Tareas candidatas:

- Empresas y sucursales.
- Categorias.
- Productos.
- Proveedores.
- Bodegas.
- Busqueda y filtros basicos.
- Validaciones de unicidad por tenant.

## Fase 4: Inventario y movimientos

Objetivo: operar stock con trazabilidad.

Tareas candidatas:

- Stock inicial.
- Entradas de inventario.
- Salidas manuales.
- Validacion para impedir stock negativo por defecto.
- Ajustes con motivo.
- Transferencias entre bodegas.
- Kardex o historial de movimientos.
- Alertas de stock minimo.

## Fase 5: Reportes basicos

Objetivo: entregar visibilidad operacional.

Tareas candidatas:

- Reporte de stock actual.
- Reporte de movimientos por periodo.
- Reporte de productos bajo minimo.
- Exportacion simple si se justifica.

## Fase 6: Especializacion por rubro

Objetivo: extender el nucleo comun con funcionalidades especificas sin duplicar modulos.

Tareas candidatas:

- Lotes y vencimientos para farmacias y alimentos.
- Codigos de barra y packs.
- Unidades de medida avanzadas.
- Listas de precio.
- Reglas de reposicion por rubro.

## Riesgos de planificacion

- Intentar cubrir todos los rubros antes de validar el nucleo.
- Implementar POS o facturacion demasiado temprano.
- Disenar permisos complejos antes de tener flujos reales.
- Confundir reportes operacionales con analitica avanzada.
