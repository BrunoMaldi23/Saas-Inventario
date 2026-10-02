# Testing

## Objetivo

Definir una estrategia de pruebas simple y verificable para asegurar reglas de negocio, aislamiento multi-tenant, permisos e inventario trazable.

## Enfoque

Las pruebas deben crecer junto con la implementacion. En Fase 0 solo se documenta la estrategia; no se crean tests ni aplicaciones.

## Tipos de prueba

### Unitarias

Validan reglas pequenas y servicios de dominio.

Casos esperados:

- Calculo de saldos.
- Validacion de cantidades.
- Reglas de permisos.
- Validacion de estados.
- Reglas de transferencia.

### Integracion

Validan modulos con base de datos o capa de persistencia.

Casos esperados:

- Consultas filtradas por tenant.
- Restricciones unicas scoped por tenant.
- Creacion de movimiento y actualizacion de saldo.
- Rechazo de relaciones entre entidades de distintos tenants.

### API

Validan endpoints REST.

Casos esperados:

- Login exitoso y fallido.
- Acceso denegado sin sesion.
- Acceso denegado sin permiso.
- CRUD de productos por tenant.
- Movimientos de inventario.
- Transferencias entre bodegas.

### E2E web

Validan flujos criticos desde interfaz.

Casos esperados:

- Login.
- Crear producto.
- Registrar stock inicial.
- Ajustar stock con motivo.
- Transferir stock.
- Ver historial de movimientos.

## Pruebas multi-tenant obligatorias

Cada funcionalidad comercial importante debe probar:

- Usuario de tenant A no puede leer datos de tenant B.
- Usuario de tenant A no puede modificar datos de tenant B.
- IDs validos de otro tenant son rechazados.
- Listados solo devuelven datos del tenant activo.
- Restricciones unicas permiten valores repetidos en tenants distintos cuando corresponde.

## Pruebas RBAC obligatorias

Cada endpoint sensible debe probar:

- Owner permitido.
- Rol autorizado permitido.
- Rol no autorizado rechazado.
- Usuario sin membresia rechazado.
- Usuario inactivo rechazado.

## Pruebas de inventario obligatorias

Casos minimos:

- Stock inicial crea saldo y movimiento.
- Entrada aumenta saldo.
- Salida disminuye saldo.
- Ajuste requiere motivo.
- Transferencia crea salida en origen y entrada en destino.
- Movimiento queda asociado a usuario y tenant.
- No se permite operar productos o bodegas de otro tenant.

## Criterios de aceptacion por fase

Fase 1:

- Build y checks basicos ejecutan.
- Configuracion base validada.
- Test HTTP de health de API y respuesta 503 cuando la base de datos no esta disponible.
- Validacion real: PostgreSQL healthy en Compose, migracion aplicada, endpoints API y pantalla web conectada.

Fase 2:

- Login y RBAC cubiertos con pruebas relevantes.
- Aislamiento multi-tenant probado.
- Pruebas HTTP con PostgreSQL real: credenciales validas/invalidas, usuario inactivo, tenant inexistente o sin membresia, usuario de dos tenants, cambio de tenant, rutas sin sesion o permiso, scopes A/B, expiracion, logout y auditoria.
- CI levanta PostgreSQL 16, aplica migraciones y ejecuta la suite antes del build.

Fase 3:

- CRUD de datos maestros probado.
- Unicidad por tenant probada.

Fase 4:

- Movimientos y saldos probados.
- Transferencias y ajustes probados.
- Auditoria minima probada.

## Riesgos de QA

- Probar solo happy path.
- No crear datos de multiples tenants en pruebas.
- No cubrir permisos negativos.
- No validar concurrencia basica en actualizaciones de stock.
- Depender de pruebas E2E para reglas que deben estar en backend.
