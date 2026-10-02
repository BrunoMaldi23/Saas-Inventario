import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  descendantIds,
  mutationErrorMessage,
  pageSummary,
  parentCandidates,
} from './catalogLogic.ts';

describe('pageSummary', () => {
  it('calcula rango y total de páginas', () => {
    assert.deepEqual(pageSummary(1, 20, 42), {
      from: 1,
      to: 20,
      totalPages: 3,
    });
    assert.deepEqual(pageSummary(3, 20, 42), {
      from: 41,
      to: 42,
      totalPages: 3,
    });
  });

  it('sin resultados muestra 0 y una página', () => {
    assert.deepEqual(pageSummary(1, 20, 0), { from: 0, to: 0, totalPages: 1 });
  });
});

const cat = (
  id: string,
  parentId: string | null,
  status: 'ACTIVE' | 'INACTIVE' = 'ACTIVE',
) => ({
  id,
  parentId,
  status,
});
// bebidas > cervezas > artesanales ; limpieza ; inactiva
const tree = [
  cat('bebidas', null),
  cat('cervezas', 'bebidas'),
  cat('artesanales', 'cervezas'),
  cat('limpieza', null),
  cat('vieja', null, 'INACTIVE'),
];

describe('categorías', () => {
  it('obtiene descendientes directos e indirectos', () => {
    assert.deepEqual([...descendantIds('bebidas', tree)].sort(), [
      'artesanales',
      'cervezas',
    ]);
  });

  it('no ofrece como padre a sí misma, sus descendientes ni inactivas', () => {
    const ids = parentCandidates(tree, 'bebidas').map((c) => c.id);
    assert.deepEqual(ids, ['limpieza']);
  });

  it('al crear ofrece todas las activas', () => {
    assert.equal(parentCandidates(tree, null).length, 4);
  });

  it('tolera datos con ciclo sin colgarse', () => {
    const cyclic = [cat('a', 'b'), cat('b', 'a')];
    assert.deepEqual([...descendantIds('a', cyclic)].sort(), ['a', 'b']);
  });
});

describe('mutationErrorMessage', () => {
  const messages = { conflict: 'SKU duplicado', notFound: 'No existe' };

  it('usa mensajes del recurso para 409 y 404', () => {
    assert.equal(mutationErrorMessage('conflict', messages), 'SKU duplicado');
    assert.equal(mutationErrorMessage('not-found', messages), 'No existe');
  });

  it('distingue permiso, validación y conexión', () => {
    assert.match(mutationErrorMessage('forbidden', messages), /rol no permite/);
    assert.match(
      mutationErrorMessage('invalid', messages),
      /rechazó los datos/,
    );
    assert.match(
      mutationErrorMessage('unavailable', messages),
      /no se guardaron/,
    );
  });
});
