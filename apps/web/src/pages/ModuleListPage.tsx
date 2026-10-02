import type { ReactNode } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { FilterBar } from '../components/ui/FilterBar';
import type { IconName } from '../components/ui/Icon';
import { ModuleNotice } from '../components/ui/ModuleNotice';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/States';

type ModuleListPageProps = {
  title: string;
  description: string;
  phase: number;
  icon: IconName;
  emptyTitle: string;
  emptyDescription: string;
  /** Acción principal futura; se muestra deshabilitada hasta tener API. */
  primaryAction?: string;
  filters?: ReactNode;
};

/*
 * Plantilla de listado para módulos sin API todavía: encabezado, filtros y
 * estado vacío. Al conectar la API, cada página reemplaza el EmptyState por
 * un DataTable con sus columnas.
 */
export function ModuleListPage({
  title,
  description,
  phase,
  icon,
  emptyTitle,
  emptyDescription,
  primaryAction,
  filters,
}: ModuleListPageProps) {
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          primaryAction && (
            <Button
              variant="primary"
              icon="plus"
              disabled
              title="Disponible cuando exista la API"
            >
              {primaryAction}
            </Button>
          )
        }
      />
      <div className="stack">
        <ModuleNotice phase={phase} />
        <Card flush>
          {filters && <FilterBar>{filters}</FilterBar>}
          <EmptyState
            icon={icon}
            title={emptyTitle}
            description={emptyDescription}
          />
        </Card>
      </div>
    </>
  );
}
