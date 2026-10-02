import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { EmptyState, ErrorState, Skeleton } from './States';

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: 'start' | 'end';
  /** En móvil la columna principal se usa como título de la tarjeta. */
  primary?: boolean;
  /** Columnas prescindibles que se ocultan en pantallas pequeñas. */
  hideOnMobile?: boolean;
};

type DataTableProps<T> = {
  /** Descripción accesible de la tabla (no visible). */
  caption: string;
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  status?: 'ready' | 'loading' | 'error';
  onRetry?: () => void;
  /** Contenido cuando no hay filas; por defecto un EmptyState genérico. */
  empty?: ReactNode;
  skeletonRows?: number;
};

/*
 * Tabla de datos con estados integrados. En pantallas angostas cada fila se
 * transforma en tarjeta (CSS), evitando scroll horizontal.
 */
export function DataTable<T>({
  caption,
  columns,
  rows,
  getRowId,
  status = 'ready',
  onRetry,
  empty,
  skeletonRows = 5,
}: DataTableProps<T>) {
  if (status === 'error') return <ErrorState onRetry={onRetry} />;
  if (status === 'ready' && rows.length === 0) {
    return <>{empty ?? <EmptyState title="Sin registros" />}</>;
  }

  return (
    <div className="table-wrap">
      <table className="table" aria-busy={status === 'loading' || undefined}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cx(
                  column.align === 'end' && 'is-end',
                  column.hideOnMobile && 'is-optional',
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {status === 'loading'
            ? Array.from({ length: skeletonRows }, (_, index) => (
                <tr key={index}>
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cx(column.hideOnMobile && 'is-optional')}
                    >
                      <Skeleton width={column.primary ? '70%' : '50%'} />
                    </td>
                  ))}
                </tr>
              ))
            : rows.map((row) => (
                <tr key={getRowId(row)}>
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      data-label={column.header}
                      className={cx(
                        column.align === 'end' && 'is-end',
                        column.primary && 'is-primary',
                        column.hideOnMobile && 'is-optional',
                      )}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}
