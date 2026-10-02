# InventarioSaaS

SaaS de inventario multi-tenant. Las Fases 1 a 4 contienen fundación técnica, identidad, catálogo y movimientos de stock transaccionales. Compras y ventas aún no están implementadas.

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
pnpm prisma:generate
```

En `.env`, cambia `POSTGRES_PASSWORD` por una contraseña local y actualiza la misma contraseña en `DATABASE_URL`. `POSTGRES_PORT` controla el puerto publicado en el equipo; si lo modificas, cambia también el puerto en `DATABASE_URL`. El puerto de ejemplo es `55432` para evitar conflictos con instalaciones locales de PostgreSQL. `.env` está excluido de Git.

## PostgreSQL y Prisma

```powershell
docker compose --env-file .env -f infrastructure/compose.yaml up -d
pnpm db:deploy
pnpm db:status
```

Detén la API antes de ejecutar `pnpm prisma:generate` en Windows. El contenedor conserva datos en un volumen de Docker. Las migraciones crean `SystemMetadata`, identidad, catálogo e inventario. También puedes usar `pnpm prisma:validate`, `pnpm prisma:migrate` y `pnpm db:status`.

Para crear el primer tenant y Owner, define `BOOTSTRAP_EMAIL`, `BOOTSTRAP_PASSWORD` (mínimo 8 caracteres) y `BOOTSTRAP_TENANT_NAME` solo en tu `.env` local y ejecuta:

```powershell
pnpm db:bootstrap
```

El bootstrap es explícito y de una sola vez por email. No agregues credenciales reales al repositorio.

## Desarrollo

```powershell
pnpm dev
```

API: <http://localhost:3000/api/v1/health> y <http://localhost:3000/api/v1/health/database>. Web: <http://localhost:5173>. Si cambias `API_PORT` o `WEB_PORT`, usa los valores de `.env`. Vite envía las solicitudes `/api` a NestJS durante el desarrollo.

Los contratos de identidad, cambio de contraseña, catálogo e inventario están en [docs/API_CONTRACTS.md](docs/API_CONTRACTS.md). El login deja el tenant sin seleccionar; el cliente debe consultar `/tenants` y llamar a `/auth/select-tenant` antes de usar rutas comerciales.

También puedes ejecutar `pnpm --filter @inventario/api dev` y `pnpm --filter @inventario/web dev` por separado después de `pnpm build`.

## Verificación

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
```

Los tests de identidad, catálogo e inventario usan PostgreSQL real y requieren Compose y las migraciones aplicadas. El workflow de CI levanta PostgreSQL, genera Prisma Client, aplica migraciones y ejecuta lint, typecheck, tests y build, sin despliegue.
