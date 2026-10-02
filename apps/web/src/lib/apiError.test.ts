import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '@inventario/api-client';
import { classifyApiError, getHttpStatus } from './apiError.ts';

const apiError = (status: number) =>
  new ApiError({ status, message: 'Request failed' });

describe('classifyApiError', () => {
  it('mapea los status del contrato', () => {
    assert.equal(classifyApiError(apiError(400)), 'invalid');
    assert.equal(classifyApiError(apiError(401)), 'unauthorized');
    assert.equal(classifyApiError(apiError(403)), 'forbidden');
    assert.equal(classifyApiError(apiError(404)), 'not-found');
    assert.equal(classifyApiError(apiError(409)), 'conflict');
  });

  it('trata red (status 0) y 5xx como servicio no disponible', () => {
    assert.equal(
      classifyApiError(
        new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'x' }),
      ),
      'unavailable',
    );
    assert.equal(classifyApiError(apiError(500)), 'unavailable');
    assert.equal(classifyApiError(apiError(503)), 'unavailable');
  });

  it('no infiere el status desde el texto del mensaje', () => {
    assert.equal(
      classifyApiError(new Error('API request failed: 401')),
      'unexpected',
    );
    assert.equal(getHttpStatus(new Error('Request failed (409)')), null);
  });

  it('marca como inesperado lo que no es ApiError', () => {
    assert.equal(classifyApiError('texto'), 'unexpected');
    assert.equal(classifyApiError(apiError(418)), 'unexpected');
  });
});
