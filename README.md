# InventarioSaaS

Fundación técnica de un SaaS de inventario multi-tenant. La Fase 1 contiene una API y una pantalla de diagnóstico de conectividad; todavía no incorpora lógica comercial ni autenticación.

## Stack

- Monorepo con pnpm 9 y Turborepo 2.
- API NestJS 11 y TypeScript estricto.
- Web React 19, Vite 7 y TypeScript estricto.
- PostgreSQL 16 en Docker Compose y Prisma 6.
- ESLint, Prettier, Vitest y GitHub Actions.

## Requisitos

- Node.js 22.20 o compatible.
- pnpm 9.14.
- Docker con Docker Compose.

## Instalación y configuración

Desde la raíz del repositorio:

```powershell
Copy-Item .env.example .env
pnpm install
```

En `.env`, cambia `POSTGRES_PASSWORD` por una contraseña local y actualiza la misma contraseña en `DATABASE_URL`. `POSTGRES_PORT` controla el puerto publicado en el equipo; si lo modificas, cambia también el puerto en `DATABASE_URL`. El puerto de ejemplo es `55432` para evitar conflictos con instalaciones locales de PostgreSQL. `.env` está excluido de Git.

## PostgreSQL y Prisma

```powershell
docker compose --env-file .env -f infrastructure/compose.yaml up -d
pnpm db:deploy
pnpm db:status
```

`pnpm install` genera Prisma Client automáticamente. Si cambias el schema, detén la API y ejecuta `pnpm db:generate`. El contenedor conserva datos en un volumen de Docker. La única tabla de esta fase es `SystemMetadata`, utilizada como modelo técnico mínimo.

## Desarrollo

```powershell
pnpm dev
```

API: <http://localhost:3000/api/v1/health> y <http://localhost:3000/api/v1/health/database>. Web: <http://localhost:5173>. Si cambias `API_PORT` o `WEB_PORT`, usa los valores de `.env`. Vite envía las solicitudes `/api` a NestJS durante el desarrollo.

También puedes ejecutar `pnpm --filter @inventario/api dev` y `pnpm --filter @inventario/web dev` por separado después de `pnpm build`.

## Verificación

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
```

Los tests de API usan una sustitución del servicio de base de datos; la verificación real de PostgreSQL se hace levantando Compose, aplicando la migración y consultando `/api/v1/health/database`. El workflow de CI ejecuta instalación, lint, typecheck, tests y build, sin despliegue.
