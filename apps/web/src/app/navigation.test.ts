import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { navigation, visibleNavigation, type NavGroup } from './navigation.ts';

const labels = (groups: NavGroup[]) =>
  groups.flatMap((group) => group.items.map((item) => item.label));

describe('visibleNavigation', () => {
  it('oculta Usuarios sin users:read', () => {
    assert.ok(!labels(visibleNavigation(navigation, [])).includes('Usuarios'));
  });

  it('muestra Usuarios con users:read', () => {
    assert.ok(
      labels(visibleNavigation(navigation, ['users:read'])).includes(
        'Usuarios',
      ),
    );
  });

  it('elimina grupos que quedan vacíos', () => {
    const groups: NavGroup[] = [
      {
        label: 'Restringido',
        items: [{ label: 'X', to: '/x', icon: 'box', permission: 'x:read' }],
      },
      { label: 'Libre', items: [{ label: 'Y', to: '/y', icon: 'box' }] },
    ];
    assert.deepEqual(
      visibleNavigation(groups, []).map((g) => g.label),
      ['Libre'],
    );
  });
});

describe('navegación de inventario', () => {
  it('inventory:read muestra Inventario, Movimientos y Transferencias', () => {
    const items = labels(visibleNavigation(navigation, ['inventory:read']));
    for (const label of ['Inventario', 'Movimientos', 'Transferencias']) {
      assert.ok(items.includes(label), label);
    }
  });

  it('sin inventory:read se ocultan', () => {
    const items = labels(visibleNavigation(navigation, ['products:read']));
    assert.ok(!items.includes('Inventario'));
    assert.ok(!items.includes('Movimientos'));
  });
});

describe('navegación de reportes', () => {
  it('reports:read muestra Reportes', () => {
    assert.ok(
      labels(visibleNavigation(navigation, ['reports:read'])).includes(
        'Reportes',
      ),
    );
  });

  it('sin reports:read se oculta (no se infiere por rol)', () => {
    assert.ok(
      !labels(
        visibleNavigation(navigation, ['inventory:read', 'products:read']),
      ).includes('Reportes'),
    );
  });
});
