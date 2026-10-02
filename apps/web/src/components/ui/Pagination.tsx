import { pageSummary } from '../../features/catalog/catalogLogic';
import { Button } from './Button';

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
};

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  disabled = false,
}: PaginationProps) {
  const { from, to, totalPages } = pageSummary(page, pageSize, total);
  return (
    <nav className="pagination" aria-label="Paginación">
      <p className="pagination__summary" aria-live="polite">
        Mostrando {from}–{to} de {total}
      </p>
      {totalPages > 1 && (
        <div className="pagination__controls">
          <Button
            size="sm"
            disabled={disabled || page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Anterior
          </Button>
          <span className="pagination__page">
            Página {page} de {totalPages}
          </span>
          <Button
            size="sm"
            disabled={disabled || page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Siguiente
          </Button>
        </div>
      )}
    </nav>
  );
}
