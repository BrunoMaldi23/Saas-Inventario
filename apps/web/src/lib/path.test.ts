import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isActivePath, normalizePath } from './path.ts';

describe('normalizePath', () => {
  it('elimina barras finales y duplicadas', () => {
    assert.equal(normalizePath('/productos/'), '/productos');
    assert.equal(normalizePath('//productos//nuevo'), '/productos/nuevo');
  });

  it('conserva la raíz', () => {
    assert.equal(normalizePath('/'), '/');
    assert.equal(normalizePath(''), '/');
  });
});

describe('isActivePath', () => {
  it('la raíz solo coincide exactamente', () => {
    assert.equal(isActivePath('/', '/'), true);
    assert.equal(isActivePath('/productos', '/'), false);
  });

  it('coincide con la ruta y sus subrutas', () => {
    assert.equal(isActivePath('/productos', '/productos'), true);
    assert.equal(isActivePath('/productos/123', '/productos'), true);
    assert.equal(isActivePath('/productos/', '/productos'), true);
  });

  it('no coincide con prefijos parciales', () => {
    assert.equal(isActivePath('/productos-archivados', '/productos'), false);
  });
});
