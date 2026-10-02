import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { DashboardReport } from '@inventario/types';
import {
  buildRange,
  dashboardStats,
  groupTotalsByUnit,
  rangeQuery,
} from './reportLogic.ts';

// 2026-10-02 23:30 en Chile (UTC-3) ya es 2026-10-03 en UTC.
const now = new Date('2026-10-03T02:30:00.000Z');

describe('buildRange (días UTC, extremos inclusivos)', () => {
  it('hoy usa el día UTC, no el local', () => {
    assert.deepEqual(buildRange('today', { from: '', to: '' }, now), {
      ok: true,
      range: {
        from: '2026-10-03T00:00:00.000Z',
        to: '2026-10-03T23:59:59.999Z',
      },
    });
  });

  it('últimos 7 días incluye hoy y 6 días previos', () => {
    const result = buildRange('last7', { from: '', to: '' }, now);
    assert.ok(result.ok && result.range);
    assert.equal(result.range.from, '2026-09-27T00:00:00.000Z');
    assert.equal(result.range.to, '2026-10-03T23:59:59.999Z');
  });

  it('últimos 30 días', () => {
    const result = buildRange('last30', { from: '', to: '' }, now);
    assert.ok(result.ok && result.range?.from === '2026-09-04T00:00:00.000Z');
  });

  it('rango personalizado exige ambos extremos', () => {
    assert.equal(
      buildRange('custom', { from: '2026-10-01', to: '' }, now).ok,
      false,
    );
    assert.equal(
      buildRange('custom', { from: '', to: '2026-10-01' }, now).ok,
      false,
    );
  });

  it('rango personalizado rechaza fin anterior al inicio', () => {
    assert.equal(
      buildRange('custom', { from: '2026-10-05', to: '2026-10-01' }, now).ok,
      false,
    );
  });

  it('rango de un solo día cubre el día completo', () => {
    assert.deepEqual(
      buildRange('custom', { from: '2026-10-01', to: '2026-10-01' }, now),
      {
        ok: true,
        range: {
          from: '2026-10-01T00:00:00.000Z',
          to: '2026-10-01T23:59:59.999Z',
        },
      },
    );
  });

  it('todo el historial no envía fechas', () => {
    assert.deepEqual(buildRange('all', { from: '', to: '' }, now), {
      ok: true,
      range: null,
    });
  });
});

describe('rangeQuery', () => {
  it('envía from y to juntos o ninguno', () => {
    assert.deepEqual(rangeQuery(null), {});
    const query = rangeQuery({ from: 'a', to: 'b' });
    assert.deepEqual(Object.keys(query).sort(), ['from', 'to']);
  });
});

describe('groupTotalsByUnit', () => {
  it('no combina unidades distintas', () => {
    const rows = groupTotalsByUnit([
      { unitOfMeasure: 'Unidad', direction: 'IN', quantity: '120', count: 8 },
      { unitOfMeasure: 'Kg', direction: 'IN', quantity: '35.5', count: 3 },
      { unitOfMeasure: 'Unidad', direction: 'OUT', quantity: '80', count: 5 },
      { unitOfMeasure: 'Kg', direction: 'OUT', quantity: '12', count: 2 },
    ]);
    assert.deepEqual(rows, [
      {
        unit: 'Kg',
        in: { quantity: '35.5', count: 3 },
        out: { quantity: '12', count: 2 },
      },
      {
        unit: 'Unidad',
        in: { quantity: '120', count: 8 },
        out: { quantity: '80', count: 5 },
      },
    ]);
  });

  it('una unidad sin salidas deja la salida vacía (no cero inventado)', () => {
    const [row] = groupTotalsByUnit([
      { unitOfMeasure: 'Litro', direction: 'IN', quantity: '3', count: 1 },
    ]);
    assert.equal(row?.out, null);
  });

  it('si se repite unidad y dirección suma de forma exacta', () => {
    const [row] = groupTotalsByUnit([
      { unitOfMeasure: 'Kg', direction: 'IN', quantity: '0.1', count: 1 },
      { unitOfMeasure: 'Kg', direction: 'IN', quantity: '0.2', count: 1 },
    ]);
    assert.deepEqual(row?.in, { quantity: '0.3', count: 2 });
  });

  it('sin totales devuelve lista vacía', () => {
    assert.deepEqual(groupTotalsByUnit([]), []);
  });
});

describe('dashboardStats', () => {
  it('mapea los conteos del backend sin recalcular', () => {
    const report = {
      activeProductCount: 33,
      activeWarehouseCount: 4,
      lowStockProductCount: 1,
      lowStockBalanceCount: 2,
      todayMovementCount: 7,
    } as DashboardReport;
    const stats = dashboardStats(report);
    assert.deepEqual(
      stats.map((s) => s.value),
      [33, 4, 1, 7],
    );
    assert.equal(stats[2]?.hint, '2 saldos producto-bodega');
  });
});
