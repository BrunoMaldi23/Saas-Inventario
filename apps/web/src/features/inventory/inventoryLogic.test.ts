import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  allowedOperations,
  compareDecimal,
  dateRangeToIso,
  emptyOperation,
  isLowStock,
  operationErrorMessage,
  quantityError,
  todayRange,
  validateOperation,
  type OperationValues,
} from './inventoryLogic.ts';

const base: OperationValues = {
  ...emptyOperation,
  productId: 'p1',
  warehouseId: 'w1',
  quantity: '5',
};

describe('permisos de inventario', () => {
  it('Viewer (solo lectura) no tiene operaciones', () => {
    assert.deepEqual(allowedOperations(['inventory:read']), []);
  });

  it('BranchManager: escritura y transferencia, sin ajuste', () => {
    assert.deepEqual(
      allowedOperations([
        'inventory:read',
        'inventory:write',
        'inventory:transfer',
      ]),
      ['initial', 'entry', 'issue', 'transfer'],
    );
  });

  it('con los cuatro permisos ofrece todas', () => {
    assert.equal(
      allowedOperations([
        'inventory:read',
        'inventory:write',
        'inventory:adjust',
        'inventory:transfer',
      ]).length,
      5,
    );
  });
});

describe('cantidades', () => {
  it('acepta positivos con hasta 3 decimales y coma decimal', () => {
    assert.equal(quantityError('5'), undefined);
    assert.equal(quantityError('2,5'), undefined);
    assert.equal(quantityError('0.001'), undefined);
  });

  it('rechaza cero, negativos, ceros a la izquierda y exceso de decimales', () => {
    for (const value of ['', '0', '0.000', '-1', '01', '1.2345', 'abc']) {
      assert.ok(quantityError(value), `debería rechazar "${value}"`);
    }
  });

  it('compara decimales sin errores de coma flotante', () => {
    assert.equal(compareDecimal('0.3', '0.1'), 1);
    assert.equal(compareDecimal('10', '10.000'), 0);
    assert.equal(compareDecimal('2.5', '10'), -1);
  });

  it('isLowStock usa cantidad <= mínimo y respeta mínimo no configurado', () => {
    assert.equal(isLowStock('3', '3'), true);
    assert.equal(isLowStock('3.001', '3'), false);
    assert.equal(isLowStock('0', null), false);
  });
});

describe('validateOperation', () => {
  it('entrada válida omite motivo vacío', () => {
    assert.deepEqual(validateOperation('entry', base, null), {
      ok: true,
      payload: {
        kind: 'stock',
        body: { productId: 'p1', warehouseId: 'w1', quantity: '5' },
      },
    });
  });

  it('ajuste exige motivo y dirección', () => {
    const result = validateOperation('adjustment', base, null);
    assert.ok(!result.ok && result.errors.reason && result.errors.direction);
  });

  it('ajuste válido envía dirección y cantidad positiva (sin signo)', () => {
    const result = validateOperation(
      'adjustment',
      { ...base, direction: 'OUT', reason: ' Merma ', quantity: '1,5' },
      { exists: true, quantity: '10' },
    );
    assert.deepEqual(result, {
      ok: true,
      payload: {
        kind: 'adjustment',
        body: {
          productId: 'p1',
          warehouseId: 'w1',
          quantity: '1.5',
          direction: 'OUT',
          reason: 'Merma',
        },
      },
    });
  });

  it('transferencia exige destino distinto del origen', () => {
    const result = validateOperation(
      'transfer',
      { ...base, toWarehouseId: 'w1' },
      null,
    );
    assert.ok(!result.ok && result.errors.toWarehouseId);
  });

  it('transferencia válida usa from/to del contrato', () => {
    const result = validateOperation(
      'transfer',
      { ...base, toWarehouseId: 'w2' },
      null,
    );
    assert.ok(
      result.ok &&
        result.payload.kind === 'transfer' &&
        result.payload.body.fromWarehouseId === 'w1' &&
        result.payload.body.toWarehouseId === 'w2',
    );
  });

  it('bloquea salidas que superan el saldo conocido', () => {
    const balance = { exists: true, quantity: '4' };
    assert.equal(validateOperation('issue', base, balance).ok, false);
    assert.equal(
      validateOperation('transfer', { ...base, toWarehouseId: 'w2' }, balance)
        .ok,
      false,
    );
    assert.equal(
      validateOperation(
        'adjustment',
        { ...base, direction: 'OUT', reason: 'x' },
        balance,
      ).ok,
      false,
    );
    // Un ajuste que aumenta no depende del saldo.
    assert.equal(
      validateOperation(
        'adjustment',
        { ...base, direction: 'IN', reason: 'x' },
        balance,
      ).ok,
      true,
    );
  });

  it('sin balance, una salida no puede superar cero', () => {
    const result = validateOperation('issue', base, {
      exists: false,
      quantity: '0',
    });
    assert.ok(!result.ok && result.errors.quantity);
  });

  it('stock inicial se bloquea si ya existe saldo', () => {
    const result = validateOperation('initial', base, {
      exists: true,
      quantity: '0',
    });
    assert.ok(!result.ok && result.errors.warehouseId);
  });
});

describe('operationErrorMessage', () => {
  it('409 distingue stock inicial repetido de stock insuficiente', () => {
    assert.match(
      operationErrorMessage('initial', 'conflict'),
      /ya tiene stock inicial/,
    );
    assert.match(
      operationErrorMessage('issue', 'conflict'),
      /Stock insuficiente/,
    );
  });

  it('mapea 403, 404 y red', () => {
    assert.match(
      operationErrorMessage('adjustment', 'forbidden'),
      /rol no permite/,
    );
    assert.match(
      operationErrorMessage('entry', 'not-found'),
      /no está disponible/,
    );
    assert.match(
      operationErrorMessage('entry', 'unavailable'),
      /no se registró/,
    );
  });
});

describe('fechas', () => {
  it('convierte un rango local a extremos ISO inclusivos', () => {
    const range = dateRangeToIso('2026-10-01', '2026-10-02');
    assert.ok(range.from && range.to);
    assert.equal(new Date(range.from).getHours(), 0);
    assert.equal(new Date(range.to).getHours(), 23);
    assert.deepEqual(dateRangeToIso('', ''), {});
  });

  it('todayRange cubre el día local completo', () => {
    const { from, to } = todayRange(new Date(2026, 9, 2, 15, 30));
    assert.equal(new Date(from).getDate(), 2);
    assert.equal(new Date(to).getMinutes(), 59);
  });
});
