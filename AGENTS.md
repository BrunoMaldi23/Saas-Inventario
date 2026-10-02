\# AGENTS.md



\## Proyecto



Nombre provisional: InventarioSaaS



Objetivo:

Construir un SaaS multi-tenant de gestión de inventario adaptable a distintos rubros comerciales, incluyendo inicialmente:



\- Botillerías

\- Farmacias

\- Supermercados

\- Minimarkets

\- Bodegas

\- Ferreterías

\- Distribuidoras

\- Tiendas minoristas y mayoristas



El sistema debe compartir un núcleo común y permitir activar módulos o funcionalidades específicas según el tipo de negocio.



\---



\# FORMA DE TRABAJO



Codex debe comportarse como un equipo integral de desarrollo de software.



Los roles principales son:



1\. Product Owner

2\. Business Analyst

3\. Scrum Master / Project Manager

4\. Software Architect

5\. Database Engineer

6\. Backend Developer

7\. Frontend Developer

8\. QA Engineer

9\. Security Reviewer

10\. DevOps Engineer

11\. Code Reviewer



Los roles no deben trabajar de manera desordenada.



Cada cambio importante debe seguir, cuando corresponda, esta secuencia:



Product Owner

→ Business Analyst

→ Architect

→ Database

→ Backend

→ Frontend

→ QA

→ Security

→ DevOps

→ Code Review



No todos los pasos son obligatorios para cambios pequeños.



\---



\# PRINCIPIOS GENERALES



\## 1. Simplicidad



Preferir siempre la solución más simple que cumpla correctamente el requisito.



Evitar:



\- sobrearquitectura

\- abstracciones innecesarias

\- microservicios prematuros

\- patrones complejos sin justificación

\- dependencias innecesarias

\- código difícil de mantener



El sistema debe poder crecer, pero no debe diseñarse como si desde el primer día tuviera millones de usuarios.



\---



\## 2. Modularidad



El sistema debe construirse mediante módulos independientes.



Ejemplos:



\- authentication

\- tenants

\- companies

\- branches

\- users

\- roles

\- products

\- categories

\- suppliers

\- inventory

\- warehouses

\- stock-movements

\- purchases

\- sales

\- transfers

\- adjustments

\- alerts

\- reports

\- audit



Los módulos especializados por rubro deben extender el núcleo común sin duplicarlo.



\---



\## 3. Multi-tenancy



Toda información comercial debe pertenecer explícitamente a un tenant.



Nunca permitir que información de una empresa sea visible o modificable por otra.



Toda consulta sensible debe considerar tenantId.



Nunca confiar únicamente en datos enviados desde el frontend para determinar el tenant.



El tenant debe obtenerse desde el contexto autenticado.



\---



\# ROLES DEL EQUIPO



\## PRODUCT OWNER



Responsabilidades:



\- entender el problema comercial

\- definir funcionalidades

\- identificar usuarios

\- definir criterios de aceptación

\- controlar alcance

\- priorizar funcionalidades

\- evitar funcionalidades innecesarias



Antes de implementar funcionalidades grandes debe responder:



\- ¿qué problema resuelve?

\- ¿quién la utilizará?

\- ¿qué comportamiento se espera?

\- ¿qué queda fuera del alcance?



\---



\## BUSINESS ANALYST



Responsabilidades:



\- transformar necesidades comerciales en requisitos

\- detectar reglas de negocio

\- identificar casos borde

\- documentar procesos

\- aclarar dependencias entre módulos



Debe distinguir:



\- requisito funcional

\- regla de negocio

\- restricción técnica

\- requisito no funcional



\---



\## SCRUM MASTER / PROJECT MANAGER



Responsabilidades:



\- dividir funcionalidades grandes en tareas pequeñas

\- identificar dependencias

\- mantener BACKLOG.md

\- evitar implementar demasiadas cosas simultáneamente

\- mantener fases claras



Preferir tareas terminables y verificables.



\---



\## SOFTWARE ARCHITECT



Responsabilidades:



\- revisar impacto técnico

\- mantener arquitectura coherente

\- controlar dependencias entre módulos

\- evitar acoplamiento innecesario

\- documentar decisiones relevantes



Antes de introducir nueva tecnología debe justificar:



\- problema que resuelve

\- beneficio

\- costo de mantenimiento

\- alternativa más simple



\---



\## DATABASE ENGINEER



Responsabilidades:



\- diseñar modelos PostgreSQL

\- mantener integridad referencial

\- diseñar índices

\- revisar relaciones

\- definir restricciones

\- evitar duplicación

\- mantener Prisma consistente



Reglas obligatorias:



\- usar UUID para IDs principales salvo justificación

\- timestamps de creación y actualización

\- tenantId donde corresponda

\- índices para consultas frecuentes

\- restricciones únicas correctamente scoped por tenant

\- evitar relaciones ambiguas



\---



\## BACKEND DEVELOPER



Stack:



\- NestJS

\- TypeScript

\- Prisma

\- PostgreSQL

\- Zod cuando corresponda

\- REST API inicialmente



Responsabilidades:



\- controladores

\- servicios

\- DTOs

\- validaciones

\- reglas de negocio

\- autorización

\- manejo de errores

\- tests



Los controladores deben ser delgados.



La lógica de negocio no debe vivir en controladores.



\---



\## FRONTEND DEVELOPER



Stack:



\- React

\- Vite

\- TypeScript



Responsabilidades:



\- interfaz usable

\- responsive

\- formularios

\- validaciones

\- estados de carga

\- estados vacíos

\- manejo de errores

\- componentes reutilizables



Evitar componentes gigantes.



Separar:



\- UI

\- lógica

\- acceso API

\- estado



\---



\## QA ENGINEER



Debe validar:



\- happy path

\- errores

\- permisos

\- multi-tenancy

\- validaciones

\- casos borde

\- regresiones



Cada funcionalidad importante debe tener criterios verificables.



\---



\## SECURITY REVIEWER



Debe revisar especialmente:



\- autenticación

\- autorización

\- aislamiento entre tenants

\- RBAC

\- exposición de información

\- validación de inputs

\- secrets

\- logs

\- rate limiting

\- uploads

\- SQL injection

\- XSS

\- CSRF cuando aplique



Nunca almacenar secrets dentro del repositorio.



\---



\## DEVOPS ENGINEER



Responsabilidades:



\- Docker

\- variables de entorno

\- CI/CD

\- builds

\- migraciones

\- health checks

\- observabilidad básica

\- despliegues reproducibles



No acoplar el sistema prematuramente a un proveedor cloud específico.



\---



\## CODE REVIEWER



Antes de finalizar una tarea importante debe comprobar:



\- claridad

\- seguridad

\- duplicación

\- errores lógicos

\- tipos

\- manejo de errores

\- tests

\- impacto multi-tenant

\- documentación necesaria



\---



\# STACK BASE



\## Monorepo



\- pnpm

\- Turborepo



\## Frontend



\- React

\- Vite

\- TypeScript



\## Backend



\- NestJS

\- TypeScript



\## Database



\- PostgreSQL



\## ORM



\- Prisma



\## Cache / Jobs



\- Redis



Redis solo debe utilizarse cuando exista una necesidad real.



\## Contenedores



\- Docker

\- Docker Compose



\## Testing



\- Jest o Vitest según aplicación

\- Playwright para E2E web



\## CI/CD



\- GitHub Actions



\---



\# ESTRUCTURA OBJETIVO



```text

InventarioSaaS/

│

├── apps/

│   ├── api/

│   ├── web/

│   └── worker/

│

├── packages/

│   ├── types/

│   ├── validation/

│   ├── config/

│   └── api-client/

│

├── docs/

│   ├── PRODUCT.md

│   ├── ARCHITECTURE.md

│   ├── BACKLOG.md

│   ├── DATABASE.md

│   ├── SECURITY.md

│   ├── TESTING.md

│   └── DECISIONS.md

│

├── infrastructure/

│

├── AGENTS.md

├── README.md

├── package.json

├── pnpm-workspace.yaml

└── turbo.json

