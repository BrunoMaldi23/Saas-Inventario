import type { ApiErrorKind } from '../../lib/apiError.ts';

/** Rango visible de una página: "Mostrando 21–40 de 42". */
export function pageSummary(page: number, pageSize: number, total: number) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return { from, to, totalPages };
}

type Node = { id: string; parentId: string | null };

/** IDs de todas las subcategorías (directas e indirectas) de `id`. */
export function descendantIds(id: string, nodes: readonly Node[]): Set<string> {
  const children = new Map<string, string[]>();
  for (const node of nodes) {
    if (!node.parentId) continue;
    const list = children.get(node.parentId) ?? [];
    list.push(node.id);
    children.set(node.parentId, list);
  }
  const result = new Set<string>();
  const stack = [...(children.get(id) ?? [])];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    if (result.has(current)) continue; // defensa ante datos con ciclos
    result.add(current);
    stack.push(...(children.get(current) ?? []));
  }
  return result;
}

/**
 * Padres posibles para una categoría: activas, excluyendo la propia y sus
 * descendientes (el backend rechaza ciclos; esto evita ofrecerlos).
 */
export function parentCandidates<
  T extends Node & { status: 'ACTIVE' | 'INACTIVE' },
>(categories: readonly T[], editingId: string | null): T[] {
  const excluded = editingId
    ? descendantIds(editingId, categories).add(editingId)
    : new Set<string>();
  return categories.filter((c) => c.status === 'ACTIVE' && !excluded.has(c.id));
}

/** Textos por recurso para los mensajes de error de escritura. */
export type EntityMessages = {
  /** 409: qué valor único chocó. */
  conflict: string;
  /** 404: registro o referencia no disponible. */
  notFound: string;
};

/** Mensaje de error para una operación de escritura de catálogo. */
export function mutationErrorMessage(
  kind: ApiErrorKind,
  messages: EntityMessages,
): string {
  switch (kind) {
    case 'conflict':
      return messages.conflict;
    case 'not-found':
      return messages.notFound;
    case 'invalid':
      return 'El servidor rechazó los datos. Revisa los campos e inténtalo nuevamente.';
    case 'forbidden':
      return 'Tu rol no permite realizar esta acción.';
    case 'unavailable':
      return 'No pudimos conectar con el servidor. Tus cambios no se guardaron.';
    case 'unauthorized':
      return 'Tu sesión expiró. Vuelve a iniciar sesión.';
    case 'unexpected':
      return 'Ocurrió un error inesperado. Inténtalo nuevamente.';
  }
}
