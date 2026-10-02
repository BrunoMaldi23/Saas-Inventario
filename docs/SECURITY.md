# Seguridad

## Objetivo

Definir controles iniciales para proteger autenticacion, autorizacion, aislamiento entre tenants y trazabilidad. La seguridad del sistema se debe disenar desde el inicio, aunque la implementacion sea incremental.

## Principios

- Nunca confiar en `tenantId` enviado libremente desde el frontend.
- Obtener tenant y usuario desde el contexto autenticado.
- Denegar por defecto cuando falte permiso.
- Validar inputs en backend.
- No registrar secrets ni datos sensibles en logs.
- Auditar acciones que cambian stock, usuarios, roles o configuracion critica.

## Aislamiento multi-tenant

Reglas:

- Toda consulta comercial debe filtrar por `tenantId`.
- Toda escritura comercial debe asignar `tenantId` desde el backend.
- Las relaciones entre entidades deben validar pertenencia al mismo tenant.
- Las transferencias no pueden cruzar tenants.
- El superadmin SaaS debe tener endpoints separados, permisos separados y auditoria estricta.

Riesgo principal: una consulta sin filtro `tenantId` puede exponer datos de otro cliente. Este riesgo debe tratarse como critico.

## Autenticacion

Estrategia inicial:

- Login con email y password.
- Password minimo de 8 caracteres.
- Password almacenado solo como hash Argon2id.
- Passwords nunca almacenadas ni registradas en texto plano.
- Sesiones web mediante cookies HTTP-only.
- Cookies `Secure` en produccion.
- `SameSite` definido segun el flujo web para reducir riesgo CSRF sin romper la experiencia.
- Autenticacion simple, sin OAuth ni proveedores externos inicialmente.
- Sesiones con expiracion.
- Proteccion contra enumeracion de usuarios en errores de login.

Pendiente de decision:

- Necesidad de refresh token en MVP.
- Recuperacion de password en fase inicial o posterior.

## Autorizacion y RBAC

Roles iniciales:

- Owner.
- Admin.
- InventoryManager.
- BranchManager.
- Viewer.

Reglas:

- Cada endpoint debe declarar permiso requerido.
- Los permisos deben validarse en backend.
- Los permisos de usuario deben pertenecer al tenant activo.
- Un usuario puede pertenecer a multiples tenants mediante `TenantMembership`.
- El tenant activo debe estar claramente definido en cada sesion u operacion.
- El control inicial por sucursal sera basico por tenant; las asignaciones por sucursal quedan preparadas para una fase futura.
- Los cambios de roles deben auditarse.
- El Owner no debe poder eliminar su unica via de administracion sin una regla de proteccion.

## Validacion de inputs

- Validar tipos, longitudes y formatos.
- Normalizar campos como email, SKU y barcode cuando corresponda.
- Rechazar cantidades invalidas, negativas o cero segun tipo de operacion.
- Rechazar referencias a entidades de otro tenant.
- Sanitizar texto libre antes de mostrarlo en frontend para reducir riesgo XSS.

## Inventario seguro

- No permitir cambios directos de saldo sin movimiento.
- Prohibir stock negativo por defecto.
- Preparar una configuracion futura por tenant para permitir stock negativo, sin implementarla inicialmente.
- Exigir motivo para ajustes manuales.
- Registrar usuario y fecha de cada movimiento.
- Auditar modificaciones de productos, bodegas y saldos.

## Logs y auditoria

Logs tecnicos:

- Errores del sistema.
- Intentos fallidos relevantes.
- Eventos de seguridad.

Auditoria funcional:

- Login y logout cuando corresponda.
- Creacion o bloqueo de usuarios.
- Cambios de roles.
- Creacion, edicion y desactivacion de productos.
- Ajustes de inventario.
- Transferencias.

## Secrets

- No almacenar secrets en el repositorio.
- Usar variables de entorno.
- Mantener `.env.example` sin valores reales cuando exista implementacion.

## Controles futuros

- Rate limiting.
- MFA para administradores.
- Politicas de password configurables.
- Revision de permisos por sucursal.
- Alertas ante actividad sospechosa.
- Backups y restauracion probada.
