import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyApiError, getHttpStatus } from './apiError.ts';

const httpError = (status: number) =>
  new Error(`API request failed: ${status}`);

describe('classifyApiError', () => {
  it('mapea los status del contrato', () => {
    assert.equal(classifyApiError(httpError(400)), 'invalid');
    assert.equal(classifyApiError(httpError(401)), 'unauthorized');
    assert.equal(classifyApiError(httpError(403)), 'forbidden');
    assert.equal(classifyApiError(httpError(404)), 'not-found');
    assert.equal(classifyApiError(httpError(409)), 'conflict');
  });

  it('trata 5xx y fallas de red como servicio no disponible', () => {
    assert.equal(classifyApiError(httpError(500)), 'unavailable');
    assert.equal(classifyApiError(httpError(503)), 'unavailable');
    assert.equal(
      classifyApiError(new TypeError('Failed to fetch')),
      'unavailable',
    );
  });

  it('marca como inesperado lo que no reconoce', () => {
    assert.equal(classifyApiError(new Error('boom')), 'unexpected');
    assert.equal(classifyApiError('texto'), 'unexpected');
    assert.equal(classifyApiError(httpError(418)), 'unexpected');
  });
});

describe('getHttpStatus', () => {
  it('extrae el status o devuelve null', () => {
    assert.equal(getHttpStatus(httpError(401)), 401);
    assert.equal(getHttpStatus(new Error('otro')), null);
  });
});
