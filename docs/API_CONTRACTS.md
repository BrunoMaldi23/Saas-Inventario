# Contratos API de identidad (Fase 2)

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
| `PATCH /memberships/:id/role`   | `{ "roleId": "UUID" }`                                                                   | `MembershipView`                                   | `memberships:manage` |
| `PATCH /memberships/:id/status` | `{ "status": "ACTIVE" o "INACTIVE" }`                                                    | `MembershipView`                                   | `memberships:manage` |

`MembershipView` contiene `{ id, user: UserSummary, role: { id, name }, status }`. `POST /users` crea una identidad nueva y su primera membresía; si el email global ya existe, responde 409. `POST /memberships` asocia por `userId` una identidad ya existente con el tenant activo. Owner administra todas las membresías. Admin puede crear y modificar usuarios con roles InventoryManager, BranchManager y Viewer, sin asignar ni modificar Owner o Admin. InventoryManager, BranchManager y Viewer no tienen permisos de identidad.

Errores principales: 400 payload inválido, 401 sesión ausente/expirada o credenciales inválidas, 403 tenant activo faltante o permiso insuficiente, 404 tenant/membresía/rol no accesible, 409 conflicto de unicidad o intento de retirar al último Owner activo. El login inválido y el usuario inactivo comparten el mismo 401 `Invalid credentials`.

Health de Fase 1 sigue público: `GET /health` y `GET /health/database`.
