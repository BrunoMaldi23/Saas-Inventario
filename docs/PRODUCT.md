# Producto

## Vision

InventarioSaaS es un sistema multi-tenant de gestion de inventario para comercios de distintos rubros, con un nucleo comun simple y extensible. La primera etapa debe permitir administrar productos, stock, bodegas, movimientos y usuarios por tenant, evitando duplicar logica por cada tipo de negocio.

El producto debe servir inicialmente a:

- Botillerias.
- Farmacias.
- Supermercados.
- Minimarkets.
- Bodegas.
- Ferreterias.
- Distribuidoras.
- Tiendas minoristas y mayoristas.

## Problema que resuelve

Muchos negocios gestionan stock en planillas, cuadernos o sistemas aislados que no entregan trazabilidad clara. Esto genera errores de conteo, quiebres de stock, compras tardias, diferencias entre sucursales y baja visibilidad para administradores.

## Usuarios principales

- Dueno o administrador del negocio: configura la empresa, usuarios, sucursales, productos y revisa reportes.
- Encargado de inventario: registra entradas, salidas, ajustes, transferencias y conteos.
- Vendedor o cajero: consulta disponibilidad y registra salidas asociadas a ventas cuando el modulo este disponible.
- Supervisor de sucursal: revisa stock local, movimientos y alertas.
- Superadmin SaaS: administra tenants, planes y estado general de cuentas, sin operar el inventario comercial salvo soporte controlado.

## Alcance inicial

La fase inicial se concentra en el nucleo comun:

- Gestion de tenants.
- Gestion de empresas y sucursales.
- Usuarios, roles y permisos basicos.
- Catalogo de productos y categorias.
- Proveedores basicos.
- Bodegas o ubicaciones de stock.
- Stock por producto y bodega.
- Movimientos de inventario trazables.
- Ajustes manuales con motivo.
- Transferencias entre bodegas del mismo tenant.
- Alertas basicas de stock minimo.
- Auditoria basica de acciones sensibles.

## Fuera de alcance inicial

No se implementara en la fase inicial:

- Punto de venta completo.
- Facturacion electronica.
- Integraciones con SII, pasarelas de pago, ERP o marketplaces.
- Contabilidad.
- Compras avanzadas con aprobaciones complejas.
- Gestion de recetas medicas.
- Control sanitario avanzado por farmacia.
- Lotes, series y vencimientos obligatorios para todos los rubros.
- Inteligencia artificial o prediccion de demanda.
- Aplicacion movil nativa.
- Microservicios.
- Multi-region o arquitectura de alta escala desde el primer dia.

## Modulos core

- Authentication: inicio de sesion, sesiones y recuperacion basica de acceso.
- Tenants: aislamiento logico de cuentas SaaS.
- Companies: datos comerciales de la empresa dentro del tenant.
- Branches: sucursales o puntos de operacion.
- Users: usuarios asociados al tenant.
- Roles: permisos por rol.
- Products: catalogo comun de productos.
- Categories: clasificacion de productos.
- Suppliers: proveedores.
- Warehouses: bodegas o ubicaciones de inventario.
- Inventory: stock actual por producto y bodega.
- Stock movements: historial de entradas, salidas, ajustes y transferencias.
- Alerts: umbrales minimos simples.
- Reports: reportes basicos de stock y movimientos.
- Audit: registro de acciones relevantes.

## Modulos especializados futuros

Los rubros deben extender el nucleo comun sin duplicarlo:

- Farmacias: vencimientos, lotes, receta, principios activos.
- Botillerias: impuestos especificos, packs, retornables.
- Ferreterias: unidades de medida, variantes tecnicas, productos a granel.
- Supermercados y minimarkets: codigos de barra, precios por volumen, reposicion.
- Distribuidoras: rutas, pedidos mayoristas y multiples listas de precio.

## Criterios de aceptacion de Fase 0

- La vision del producto queda documentada.
- El alcance inicial y fuera de alcance quedan claros.
- Los modulos core estan definidos.
- Las reglas multi-tenant estan explicitadas.
- La arquitectura inicial queda definida sin implementar codigo.
- El modelo conceptual de datos queda documentado.
- La estrategia de autenticacion y RBAC queda acordada.
- La estrategia de inventario y trazabilidad queda documentada.
- El backlog inicial queda dividido por fases.
- Los riesgos tecnicos iniciales quedan identificados.
