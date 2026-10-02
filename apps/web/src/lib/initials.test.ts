import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initials } from './initials.ts';

describe('initials', () => {
  it('usa primera y última palabra', () => {
    assert.equal(initials('Ana María Pérez'), 'AP');
  });

  it('soporta un solo nombre y espacios extra', () => {
    assert.equal(initials('  carla  '), 'C');
  });

  it('devuelve un marcador si el nombre está vacío', () => {
    assert.equal(initials('   '), '?');
  });
});
