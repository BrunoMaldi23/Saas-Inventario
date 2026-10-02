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

Implementacion de Fase 2: cookie HTTP-only, `SameSite=Lax`, `Secure` en produccion y duracion de 8 horas. Se almacena en `Session` solo SHA-256 del token aleatorio; logout borra la sesion. Login invalido, usuario inexistente e inactivo responden igual y realizan verificacion Argon2id para reducir diferencias de tiempo. El frontend debe usar el mismo origen mediante proxy o reverse proxy. Un guard rechaza escrituras con `Origin`/`Referer` de otro origen y `Sec-Fetch-Site: cross-site`; `SameSite` agrega defensa adicional. No se habilita CORS entre origenes en esta fase.

El cambio de contraseña de Fase 4 exige sesion y contraseña actual; nunca devuelve hashes ni registra contraseñas. Tras actualizar Argon2id revoca las otras sesiones y audita `PASSWORD_CHANGED` atomicamente. La sesion actual conserva su expiracion previa. Contraseña actual incorrecta responde 401 generico; payload invalido responde 400.

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

Implementacion de Fase 2: cada request protegida revisa la sesion, estado de usuario y, cuando corresponde, tenant y membresia activos. Roles y permisos se consultan del servidor en cada request; no se aceptan permisos del cliente. Owner gestiona todas las identidades; Admin gestiona solo usuarios con roles operativos y no puede asignar ni modificar Owner o Admin. Los cambios que retirarian al ultimo Owner activo se rechazan dentro de transacciones serializables. Las operaciones de identidad relevantes escriben auditoria en la misma transaccion.

Implementacion de Fase 3: cada ruta de catalogo declara permiso `recurso:read` o `recurso:write`. El API toma `tenantId` exclusivamente de la sesion; Zod rechaza campos no declarados, incluido `tenantId`, en escrituras. Las lecturas y los targets de actualizacion se acotan por tenant. Las referencias a Company, Branch y Category se validan en el servicio y estan protegidas tambien por claves foraneas compuestas. La auditoria de creacion y actualizacion se escribe en la misma transaccion que el registro. La desactivacion se realiza con PATCH de `status`; no se exponen DELETE comerciales.

En Fase 4, `inventory:read`, `inventory:write`, `inventory:adjust` e `inventory:transfer` se verifican en backend. Producto, bodega y sus padres operativos deben estar activos y pertenecer al tenant. Cada balance, movimiento y transferencia tiene `tenantId`; relaciones compuestas lo refuerzan en PostgreSQL. El decremento condicional y CHECK de saldo impiden stock negativo incluso bajo carreras. Stock inicial, ajustes y transferencias crean `AuditLog`; entradas y salidas manuales ya quedan trazadas por `StockMovement`, sin duplicarlas en auditoria.

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




## Endurecimiento de contratos (Fase 4.1)

- `POST /memberships/by-email` requiere sesión, tenant activo y `memberships:manage`; solo busca email exacto normalizado y devuelve el mismo 404 para usuario ausente o inactivo. Nunca devuelve coincidencias múltiples ni permite exploración parcial. La unicidad compuesta impide membresías duplicadas y la creación se audita.
- El cliente interpreta errores por `ApiError.status`, nunca por el texto. Para 5xx muestra un mensaje genérico y no propaga el mensaje interno del servidor; la falla de red tiene status 0.
- Los resúmenes de catálogo/inventario se seleccionan dentro del mismo tenant y contienen solo identificador y etiqueta legible. No incluyen información sensible ni hashes.

## Controles futuros

- Rate limiting.
- MFA para administradores.
- Politicas de password configurables.
- Revision de permisos por sucursal.
- Alertas ante actividad sospechosa.
- Backups y restauracion probada.

