/** Normaliza un pathname: sin barra final (salvo raíz) y sin barras duplicadas. */
export function normalizePath(pathname: string): string {
  const collapsed = pathname.replace(/\/{2,}/g, '/');
  const trimmed =
    collapsed.length > 1 ? collapsed.replace(/\/+$/, '') : collapsed;
  return trimmed === '' ? '/' : trimmed;
}

/**
 * Indica si un enlace de navegación debe marcarse activo.
 * La raíz solo coincide exactamente; el resto también coincide con subrutas.
 */
export function isActivePath(current: string, target: string): boolean {
  const path = normalizePath(current);
  const base = normalizePath(target);
  if (base === '/') return path === '/';
  return path === base || path.startsWith(`${base}/`);
}
