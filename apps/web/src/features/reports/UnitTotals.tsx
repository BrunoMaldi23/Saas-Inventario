import type { MovementUnitTotal } from '@inventario/types';
import { formatDecimal } from '../catalog/format';
import { groupTotalsByUnit, type UnitSide } from './reportLogic';

const countLabel = (count: number) =>
  `${count} ${count === 1 ? 'movimiento' : 'movimientos'}`;

function Side({ side, tone }: { side: UnitSide | null; tone: 'in' | 'out' }) {
  if (!side) return <span className="cell-muted">—</span>;
  return (
    <span>
      <span className={tone === 'in' ? 'qty qty--in' : 'qty qty--out'}>
        {tone === 'in' ? '+' : '−'}
        {formatDecimal(side.quantity)}
      </span>
      <span className="cell-muted cell-block">{countLabel(side.count)}</span>
    </span>
  );
}

/**
 * Entradas y salidas agrupadas por unidad de medida, tal como las entrega el
 * backend. Cada unidad tiene su fila: no hay un total combinado.
 */
export function UnitTotals({
  totals,
  emptyText = 'Sin movimientos en el período.',
}: {
  totals: readonly MovementUnitTotal[];
  emptyText?: string;
}) {
  const rows = groupTotalsByUnit(totals);
  if (rows.length === 0) return <p className="cell-muted">{emptyText}</p>;
  return (
    <table className="unit-totals">
      <caption className="sr-only">Entradas y salidas por unidad</caption>
      <thead>
        <tr>
          <th scope="col">Unidad</th>
          <th scope="col">Entradas</th>
          <th scope="col">Salidas</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.unit}>
            <th scope="row">{row.unit}</th>
            <td>
              <Side side={row.in} tone="in" />
            </td>
            <td>
              <Side side={row.out} tone="out" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
