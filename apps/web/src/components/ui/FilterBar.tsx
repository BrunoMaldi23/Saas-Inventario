import type { ReactNode } from 'react';

type FilterBarProps = {
  /** Filtros (búsqueda, selects). Se apilan en móvil. */
  children: ReactNode;
  /** Acciones secundarias alineadas a la derecha (exportar, limpiar). */
  actions?: ReactNode;
  label?: string;
};

export function FilterBar({
  children,
  actions,
  label = 'Filtros',
}: FilterBarProps) {
  return (
    <div className="filter-bar" role="search" aria-label={label}>
      <div className="filter-bar__filters">{children}</div>
      {actions && <div className="filter-bar__actions">{actions}</div>}
    </div>
  );
}
