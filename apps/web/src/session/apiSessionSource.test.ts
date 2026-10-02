import { describe, it } from 'node:test';
import { ApiError } from '@inventario/api-client';
import assert from 'node:assert/strict';
import type {
  ActiveTenant,
  AuthSessionResponse,
  TenantOption,
} from '@inventario/types';
import { createApiSessionSource, type AuthClient } from './apiSessionSource.ts';
import { roleLabel } from './types.ts';

const user = { id: 'u1', email: 'ana@tienda.cl', name: 'Ana' };
const tenantA: TenantOption = { id: 't1', name: 'Norte', role: 'Owner' };
const tenantB: TenantOption = { id: 't2', name: 'Sur', role: 'Viewer' };

function auth(activeTenant: ActiveTenant | null = null): AuthSessionResponse {
  return { user, activeTenant, expiresAt: '2026-10-02T20:00:00.000Z' };
}

function active(tenant: TenantOption): ActiveTenant {
  return { ...tenant, permissions: [] };
}

const httpError = (status: number) =>
  new ApiError({ status, message: `Request failed (${status})` });
const networkError = () =>
  new ApiError({
    status: 0,
    code: 'NETWORK_ERROR',
    message: 'Network request failed',
  });

function fakeClient(
  tenants: TenantOption[],
  overrides: Partial<AuthClient> = {},
): AuthClient & { selected: string[] } {
  const selected: string[] = [];
  return {
    selected,
    getMe: async () => auth(),
    login: async () => auth(),
    logout: async () => undefined,
    listTenants: async () => ({ tenants }),
    selectTenant: async ({ tenantId }) => {
      selected.push(tenantId);
      const tenant = tenants.find((t) => t.id === tenantId);
      if (!tenant) throw httpError(404);
      return auth(active(tenant));
    },
    ...overrides,
  };
}

const credentials = { email: user.email, password: 'segura123' };

describe('apiSessionSource', () => {
  it('sin cookie válida (401) devuelve null', async () => {
    const source = createApiSessionSource(
      fakeClient([tenantA], {
        getMe: async () => {
          throw httpError(401);
        },
      }),
    );
    assert.equal(await source.getSession(), null);
  });

  it('propaga errores que no son 401 (backend offline)', async () => {
    const source = createApiSessionSource(
      fakeClient([tenantA], {
        getMe: async () => {
          throw networkError();
        },
      }),
    );
    await assert.rejects(source.getSession(), ApiError);
  });

  it('login con un solo tenant lo selecciona automáticamente', async () => {
    const client = fakeClient([tenantA]);
    const session = await createApiSessionSource(client).login(credentials);
    assert.deepEqual(client.selected, ['t1']);
    assert.equal(session.activeTenant?.id, 't1');
    assert.deepEqual(session.tenants, [tenantA]);
  });

  it('login con varios tenants deja la selección al usuario', async () => {
    const client = fakeClient([tenantA, tenantB]);
    const session = await createApiSessionSource(client).login(credentials);
    assert.deepEqual(client.selected, []);
    assert.equal(session.activeTenant, null);
    assert.equal(session.tenants.length, 2);
  });

  it('login sin tenants no intenta seleccionar', async () => {
    const client = fakeClient([]);
    const session = await createApiSessionSource(client).login(credentials);
    assert.deepEqual(client.selected, []);
    assert.equal(session.activeTenant, null);
  });

  it('propaga el 401 de credenciales inválidas', async () => {
    const source = createApiSessionSource(
      fakeClient([tenantA], {
        login: async () => {
          throw httpError(401);
        },
      }),
    );
    await assert.rejects(
      source.login(credentials),
      (e) => e instanceof ApiError && e.status === 401,
    );
  });

  it('switchTenant usa la respuesta real y refresca tenants', async () => {
    const client = fakeClient([tenantA, tenantB]);
    const session = await createApiSessionSource(client).switchTenant('t2');
    assert.equal(session.activeTenant?.id, 't2');
    assert.equal(session.tenants.length, 2);
  });

  it('switchTenant propaga 404 de tenant sin membresía', async () => {
    const source = createApiSessionSource(fakeClient([tenantA]));
    await assert.rejects(
      source.switchTenant('ajeno'),
      (e) => e instanceof ApiError && e.status === 404,
    );
  });

  it('logout tolera una sesión ya expirada pero no fallas de red', async () => {
    const expired = createApiSessionSource(
      fakeClient([], {
        logout: async () => {
          throw httpError(401);
        },
      }),
    );
    await expired.logout();
    const offline = createApiSessionSource(
      fakeClient([], {
        logout: async () => {
          throw networkError();
        },
      }),
    );
    await assert.rejects(offline.logout(), ApiError);
  });
});

describe('roleLabel', () => {
  it('traduce roles base y conserva roles personalizados', () => {
    assert.equal(roleLabel('Owner'), 'Propietario');
    assert.equal(roleLabel('Cajero nocturno'), 'Cajero nocturno');
  });
});
