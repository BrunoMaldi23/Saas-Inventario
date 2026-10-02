import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createMockSessionSource } from './mockSessionSource.ts';
import { InvalidCredentialsError, roleLabel } from './types.ts';

const fast = { latencyMs: 0 };

describe('mockSessionSource', () => {
  it('inicia autenticado con tenant activo por defecto', async () => {
    const source = createMockSessionSource(fast);
    const session = await source.getSession();
    assert.ok(session);
    assert.equal(session.activeTenantId, 'mock-tenant-1');
  });

  it('rechaza credenciales inválidas con un error genérico', async () => {
    const source = createMockSessionSource({
      ...fast,
      startAuthenticated: false,
    });
    await assert.rejects(
      source.login({ email: 'no-es-correo', password: '12345678' }),
      InvalidCredentialsError,
    );
    await assert.rejects(
      source.login({ email: 'a@b.cl', password: 'corta' }),
      InvalidCredentialsError,
    );
  });

  it('tras login exige elegir empresa', async () => {
    const source = createMockSessionSource({
      ...fast,
      startAuthenticated: false,
    });
    const session = await source.login({
      email: ' Ana@Tienda.CL ',
      password: 'segura123',
    });
    assert.equal(session.activeTenantId, null);
    assert.equal(session.user.email, 'ana@tienda.cl');
  });

  it('solo permite cambiar a empresas con membresía', async () => {
    const source = createMockSessionSource(fast);
    const session = await source.switchTenant('mock-tenant-2');
    assert.equal(session.activeTenantId, 'mock-tenant-2');
    await assert.rejects(source.switchTenant('tenant-ajeno'));
  });

  it('logout elimina la sesión', async () => {
    const source = createMockSessionSource(fast);
    await source.logout();
    assert.equal(await source.getSession(), null);
  });

  it('no expone el estado interno por referencia', async () => {
    const source = createMockSessionSource(fast);
    const session = await source.getSession();
    assert.ok(session);
    session.activeTenantId = 'manipulado';
    assert.equal((await source.getSession())?.activeTenantId, 'mock-tenant-1');
  });
});

describe('roleLabel', () => {
  it('traduce roles base y conserva roles personalizados', () => {
    assert.equal(roleLabel('Owner'), 'Propietario');
    assert.equal(roleLabel('Cajero nocturno'), 'Cajero nocturno');
  });
});
