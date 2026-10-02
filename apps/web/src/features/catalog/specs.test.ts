import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { diffPayload, textOrNull } from './formUtils.ts';
import {
  branchSpec,
  categorySpec,
  companySpec,
  productSpec,
  supplierSpec,
  memberByEmailSpec,
  userSpec,
  warehouseSpec,
} from './specs.ts';

const product = {
  ...productSpec.empty,
  name: 'Agua 1,5 L',
  unitOfMeasure: 'Unidad',
};

describe('productSpec', () => {
  it('exige nombre y unidad', () => {
    const result = productSpec.validate(productSpec.empty);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(result.errors.name);
      assert.ok(result.errors.unitOfMeasure);
    }
  });

  it('convierte vacíos opcionales en null y recorta textos', () => {
    const result = productSpec.validate({ ...product, name: '  Agua  ' });
    assert.deepEqual(result, {
      ok: true,
      payload: {
        name: 'Agua',
        sku: null,
        barcode: null,
        categoryId: null,
        unitOfMeasure: 'Unidad',
        minStock: null,
        description: null,
      },
    });
  });

  it('valida SKU, código de barras y stock mínimo según contrato', () => {
    const result = productSpec.validate({
      ...product,
      sku: 'BEB 01',
      barcode: '780-123',
      minStock: '-1',
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(result.errors.sku);
      assert.ok(result.errors.barcode);
      assert.ok(result.errors.minStock);
    }
  });

  it('acepta coma decimal en stock mínimo y la normaliza', () => {
    const result = productSpec.validate({ ...product, minStock: '2,5' });
    assert.ok(result.ok && result.payload.minStock === '2.5');
    assert.equal(
      productSpec.validate({ ...product, minStock: '1.2345' }).ok,
      false,
    );
  });
});

describe('otros formularios', () => {
  it('bodega exige sucursal y tipo', () => {
    const result = warehouseSpec.validate({
      name: 'Central',
      branchId: '',
      type: '',
    });
    assert.ok(!result.ok && result.errors.branchId && result.errors.type);
  });

  it('proveedor valida correo opcional', () => {
    assert.equal(
      supplierSpec.validate({ ...supplierSpec.empty, name: 'X', email: 'malo' })
        .ok,
      false,
    );
    assert.equal(
      supplierSpec.validate({ ...supplierSpec.empty, name: 'X' }).ok,
      true,
    );
  });

  it('categoría raíz envía parentId null', () => {
    const result = categorySpec.validate({ name: 'Bebidas', parentId: '' });
    assert.ok(result.ok && result.payload.parentId === null);
  });

  it('sucursal exige empresa y empresa limita longitudes', () => {
    assert.equal(
      branchSpec.validate({ name: 'Centro', companyId: '', address: '' }).ok,
      false,
    );
    assert.equal(
      companySpec.validate({
        name: 'A',
        taxId: 'x'.repeat(41),
        businessType: '',
      }).ok,
      false,
    );
  });
});

describe('diffPayload', () => {
  it('devuelve solo los campos modificados', () => {
    assert.deepEqual(
      diffPayload(
        { name: 'A', sku: null, minStock: '1' },
        { name: 'B', sku: null, minStock: '1' },
      ),
      { name: 'B' },
    );
  });

  it('detecta cuando se limpia un campo', () => {
    assert.deepEqual(diffPayload({ sku: 'X1' }, { sku: null }), { sku: null });
  });

  it('sin cambios devuelve objeto vacío', () => {
    const before = productSpec.validate(product);
    assert.ok(before.ok);
    assert.deepEqual(diffPayload(before.payload, before.payload), {});
  });
});

describe('textOrNull', () => {
  it('normaliza vacíos', () => {
    assert.equal(textOrNull('   '), null);
    assert.equal(textOrNull(' a '), 'a');
  });
});

describe('userSpec', () => {
  it('exige todos los campos y contraseña de 8+', () => {
    const result = userSpec.validate({
      name: '',
      email: 'malo',
      password: 'corta',
      roleId: '',
    });
    assert.ok(
      !result.ok &&
        result.errors.name &&
        result.errors.email &&
        result.errors.password &&
        result.errors.roleId,
    );
  });

  it('normaliza el correo y no recorta la contraseña', () => {
    const result = userSpec.validate({
      name: ' Ana ',
      email: ' Ana@Tienda.CL ',
      password: ' clave segura ',
      roleId: 'r1',
    });
    assert.deepEqual(result, {
      ok: true,
      payload: {
        name: 'Ana',
        email: 'ana@tienda.cl',
        password: ' clave segura ',
        roleId: 'r1',
      },
    });
  });
});

describe('memberByEmailSpec', () => {
  it('exige correo válido y rol', () => {
    const result = memberByEmailSpec.validate({ email: 'malo', roleId: '' });
    assert.ok(!result.ok && result.errors.email && result.errors.roleId);
  });

  it('normaliza el correo a minúsculas (coincidencia exacta del contrato)', () => {
    assert.deepEqual(
      memberByEmailSpec.validate({ email: ' Ana@Tienda.CL ', roleId: 'r1' }),
      { ok: true, payload: { email: 'ana@tienda.cl', roleId: 'r1' } },
    );
  });
});
