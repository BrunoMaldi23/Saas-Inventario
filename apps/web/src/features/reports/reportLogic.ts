/*
 * Lógica pura de reportes (Fase 5). El backend calcula todas las métricas;
 * aquí solo se arman los rangos de fecha del contrato y se presentan los
 * totales por unidad sin combinar unidades distintas.
 */
import type {
  DashboardReport,
  MovementUnitTotal,
  ReportRange,
} from '@inventario/types';
import { toMilli } from '../inventory/inventoryLogic.ts';

// ---------- Períodos ----------
export type PeriodPreset = 'all' | 'today' | 'last7' | 'last30' | 'custom';

export const periodLabels: Record<PeriodPreset, string> = {
  all: 'Todo el historial',
  today: 'Hoy (UTC)',
  last7: 'Últimos 7 días (UTC)',
  last30: 'Últimos 30 días (UTC)',
  custom: 'Rango personalizado (UTC)',
};

const DAY_MS = 86_400_000;

function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Día calendario UTC completo como extremos ISO inclusivos. */
export function utcDayRange(fromDay: string, toDay: string): ReportRange {
  return {
    from: `${fromDay}T00:00:00.000Z`,
    to: `${toDay}T23:59:59.999Z`,
  };
}

export type RangeResult =
  | { ok: true; range: ReportRange | null }
  | { ok: false; error: string };

/**
 * Rango del contrato: `from` y `to` siempre juntos (o ninguno), ISO 8601 con
 * zona, ambos inclusivos. Los días se interpretan en UTC, igual que el
 * servidor; nunca con la zona del navegador.
 */
export function buildRange(
  preset: PeriodPreset,
  custom: { from: string; to: string },
  now: Date = new Date(),
): RangeResult {
  const today = utcDay(now);
  switch (preset) {
    case 'all':
      return { ok: true, range: null };
    case 'today':
      return { ok: true, range: utcDayRange(today, today) };
    case 'last7':
      return {
        ok: true,
        range: utcDayRange(utcDay(new Date(now.getTime() - 6 * DAY_MS)), today),
      };
    case 'last30':
      return {
        ok: true,
        range: utcDayRange(
          utcDay(new Date(now.getTime() - 29 * DAY_MS)),
          today,
        ),
      };
    case 'custom':
      if (!custom.from || !custom.to)
        return { ok: false, error: 'Indica ambas fechas del rango.' };
      if (custom.from > custom.to)
        return {
          ok: false,
          error: 'La fecha final debe ser igual o posterior a la inicial.',
        };
      return { ok: true, range: utcDayRange(custom.from, custom.to) };
  }
}

/** Query de fechas lista para el cliente: ambos extremos o ninguno. */
export function rangeQuery(range: ReportRange | null): {
  from?: string;
  to?: string;
} {
  return range ? { from: range.from, to: range.to } : {};
}

// ---------- Totales por unidad ----------
export type UnitSide = { quantity: string; count: number };
export type UnitTotalsRow = {
  unit: string;
  in: UnitSide | null;
  out: UnitSide | null;
};

function fromMilli(value: bigint): string {
  const int = value / 1000n;
  const frac = (value % 1000n).toString().padStart(3, '0').replace(/0+$/, '');
  return frac ? `${int}.${frac}` : `${int}`;
}

/**
 * Agrupa los totales del backend por unidad de medida. Cada unidad queda en
 * su propia fila: nunca se suman unidades distintas (kg + unidades). Si el
 * backend repitiera una misma unidad y dirección, se suman de forma exacta.
 */
export function groupTotalsByUnit(
  totals: readonly MovementUnitTotal[],
): UnitTotalsRow[] {
  const rows = new Map<string, UnitTotalsRow>();
  for (const total of totals) {
    const row = rows.get(total.unitOfMeasure) ?? {
      unit: total.unitOfMeasure,
      in: null,
      out: null,
    };
    const key = total.direction === 'IN' ? 'in' : 'out';
    const current = row[key];
    row[key] = current
      ? {
          quantity: fromMilli(
            toMilli(current.quantity) + toMilli(total.quantity),
          ),
          count: current.count + total.count,
        }
      : { quantity: total.quantity, count: total.count };
    rows.set(total.unitOfMeasure, row);
  }
  return [...rows.values()].sort((a, b) => a.unit.localeCompare(b.unit, 'es'));
}

// ---------- Dashboard ----------
export type DashboardStat = {
  key: string;
  label: string;
  value: number;
  hint?: string;
};

/** Indicadores del dashboard tal como los entrega el backend. */
export function dashboardStats(report: DashboardReport): DashboardStat[] {
  return [
    {
      key: 'products',
      label: 'Productos activos',
      value: report.activeProductCount,
    },
    {
      key: 'warehouses',
      label: 'Bodegas activas',
      value: report.activeWarehouseCount,
    },
    {
      key: 'lowStock',
      label: 'Productos bajo mínimo',
      value: report.lowStockProductCount,
      hint: `${report.lowStockBalanceCount} ${report.lowStockBalanceCount === 1 ? 'saldo' : 'saldos'} producto-bodega`,
    },
    {
      key: 'today',
      label: 'Movimientos hoy (UTC)',
      value: report.todayMovementCount,
    },
  ];
}
