import { SearchInput, Select } from '../components/ui/Field';
import { ModuleListPage } from './ModuleListPage';

/*
 * Pantallas de listado aún sin API. Los filtros están deshabilitados porque
 * no hay datos sobre los que operar; sus opciones vendrán del backend.
 */

export function InventoryPage() {
  return (
    <ModuleListPage
      title="Inventario"
      description="Stock actual por producto y bodega."
      phase={4}
      icon="layers"
      emptyTitle="Aún no hay stock registrado"
      emptyDescription="El stock aparecerá aquí cuando se registre stock inicial o entradas de inventario."
      filters={
        <>
          <SearchInput
            label="Buscar producto"
            placeholder="Buscar producto"
            disabled
          />
          <Select aria-label="Bodega" defaultValue="" disabled>
            <option value="">Todas las bodegas</option>
          </Select>
        </>
      }
    />
  );
}

/** Tipos documentados en docs/ARCHITECTURE.md (Inventario y trazabilidad). */
const movementTypes = [
  ['InitialStock', 'Stock inicial'],
  ['PurchaseReceipt', 'Recepción de compra'],
  ['SaleIssue', 'Salida por venta'],
  ['ManualAdjustment', 'Ajuste manual'],
  ['TransferOut', 'Transferencia (salida)'],
  ['TransferIn', 'Transferencia (entrada)'],
  ['StockCountCorrection', 'Corrección por conteo'],
] as const;

export function MovementsPage() {
  return (
    <ModuleListPage
      title="Movimientos"
      description="Historial trazable de entradas, salidas, ajustes y transferencias."
      phase={4}
      icon="movements"
      emptyTitle="Sin movimientos registrados"
      emptyDescription="Cada cambio de stock generará un movimiento con usuario, fecha y motivo."
      primaryAction="Registrar movimiento"
      filters={
        <>
          <SearchInput
            label="Buscar producto o referencia"
            placeholder="Producto o referencia"
            disabled
          />
          <Select aria-label="Tipo de movimiento" defaultValue="" disabled>
            <option value="">Todos los tipos</option>
            {movementTypes.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </>
      }
    />
  );
}
