import { useState, type ReactNode } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { ConfirmDialog } from '../../components/ui/Dialog';
import { SearchInput, Select } from '../../components/ui/Field';
import { FilterBar } from '../../components/ui/FilterBar';
import type { IconName } from '../../components/ui/Icon';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import {
  EmptyState,
  ErrorState,
  ForbiddenState,
} from '../../components/ui/States';
import { useToast } from '../../components/ui/toastContext';
import { apiErrorMessage, classifyApiError } from '../../lib/apiError';
import type {
  CatalogPage,
  CatalogQuery,
  RecordStatus,
} from '../../lib/apiTypes';
import { useSession } from '../../session/sessionContext';
import { mutationErrorMessage, type EntityMessages } from './catalogLogic';
import { PAGE_SIZE, useCatalogList } from './useCatalogList';
import type { SaveOutcome } from './useEntityForm';

type CatalogItem = { id: string; name: string; status: RecordStatus };

/** Textos de un recurso. `gender` concuerda "creado/creada". */
export type EntityLabels = EntityMessages & {
  singular: string;
  plural: string;
  gender: 'm' | 'f';
};

export type FormRenderProps<T> = {
  record: T | null;
  onCancel: () => void;
  onSaved: (record: T, outcome: SaveOutcome) => void;
};

type CatalogListPageProps<T extends CatalogItem> = {
  title: string;
  description: string;
  labels: EntityLabels;
  readPermission: string;
  writePermission: string;
  list: (query: CatalogQuery) => Promise<CatalogPage<T>>;
  setStatus: (id: string, status: RecordStatus) => Promise<T>;
  columns: Column<T>[];
  searchLabel: string;
  icon: IconName;
  renderForm: (props: FormRenderProps<T>) => ReactNode;
  /** Contenido opcional sobre la tabla (avisos del módulo). */
  notice?: ReactNode;
};

type FormState<T> = { mode: 'closed' } | { mode: 'open'; record: T | null };

const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

/**
 * Pantalla de listado de catálogo: búsqueda, estado, paginación, estados de
 * vista y CRUD (crear, editar, activar/desactivar) según permisos de UI.
 */
export function CatalogListPage<T extends CatalogItem>({
  title,
  description,
  labels,
  readPermission,
  writePermission,
  list,
  setStatus,
  columns,
  searchLabel,
  icon,
  renderForm,
  notice,
}: CatalogListPageProps<T>) {
  const { can, expireSession } = useSession();
  const { notify } = useToast();
  const listState = useCatalogList(list);
  const [form, setForm] = useState<FormState<T>>({ mode: 'closed' });
  const [confirming, setConfirming] = useState<T | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const canWrite = can(writePermission);
  const done = labels.gender === 'f' ? 'a' : 'o';

  if (!can(readPermission)) return <ForbiddenState />;

  const changeStatus = async (record: T, status: RecordStatus) => {
    setPendingId(record.id);
    try {
      await setStatus(record.id, status);
      notify(
        `${capitalize(labels.singular)} ${status === 'ACTIVE' ? 'activad' : 'desactivad'}${done}.`,
      );
      listState.reload();
    } catch (error) {
      const kind = classifyApiError(error);
      if (kind === 'unauthorized') return expireSession();
      notify(mutationErrorMessage(kind, labels), 'danger');
    } finally {
      setPendingId(null);
      setConfirming(null);
    }
  };

  const actionsColumn: Column<T> = {
    key: 'actions',
    header: 'Acciones',
    align: 'end',
    render: (record) => (
      <span className="row-actions">
        <Button
          size="sm"
          variant="ghost"
          aria-label={`Editar ${record.name}`}
          disabled={pendingId === record.id}
          onClick={() => setForm({ mode: 'open', record })}
        >
          Editar
        </Button>
        {record.status === 'ACTIVE' ? (
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Desactivar ${record.name}`}
            disabled={pendingId === record.id}
            onClick={() => setConfirming(record)}
          >
            Desactivar
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Activar ${record.name}`}
            loading={pendingId === record.id}
            onClick={() => void changeStatus(record, 'ACTIVE')}
          >
            Activar
          </Button>
        )}
      </span>
    ),
  };

  const { state } = listState;
  let content: ReactNode;
  if (state.status === 'error' && state.kind === 'forbidden') {
    content = <ForbiddenState />;
  } else if (state.status === 'error') {
    content = (
      <ErrorState
        icon={state.kind === 'unavailable' ? 'wifiOff' : 'alertTriangle'}
        description={apiErrorMessage(state.kind)}
        onRetry={listState.reload}
      />
    );
  } else {
    const data = state.status === 'success' ? state.data : null;
    content = (
      <>
        <DataTable
          caption={`Listado de ${labels.plural}`}
          columns={canWrite ? [...columns, actionsColumn] : columns}
          rows={data?.items ?? []}
          getRowId={(record) => record.id}
          status={state.status === 'loading' ? 'loading' : 'ready'}
          empty={
            listState.hasFilters ? (
              <EmptyState
                icon="search"
                title="Sin resultados"
                description={`${labels.gender === 'f' ? 'Ninguna' : 'Ningún'} ${labels.singular} coincide con los filtros.`}
                action={
                  <Button onClick={listState.clearFilters}>
                    Limpiar filtros
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={icon}
                title={`Aún no hay ${labels.plural}`}
                description={
                  canWrite
                    ? `Crea ${labels.gender === 'f' ? 'la primera' : 'el primer'} ${labels.singular} para comenzar.`
                    : `Cuando se registren ${labels.plural} aparecerán aquí.`
                }
                action={
                  canWrite && (
                    <Button
                      variant="primary"
                      icon="plus"
                      onClick={() => setForm({ mode: 'open', record: null })}
                    >
                      {`Crear ${labels.singular}`}
                    </Button>
                  )
                }
              />
            )
          }
        />
        {data && data.total > 0 && (
          <Pagination
            page={data.page}
            pageSize={PAGE_SIZE}
            total={data.total}
            onPageChange={listState.setPage}
          />
        )}
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          canWrite && (
            <Button
              variant="primary"
              icon="plus"
              onClick={() => setForm({ mode: 'open', record: null })}
            >
              {`Nuev${done} ${labels.singular}`}
            </Button>
          )
        }
      />
      <div className="stack">
        {notice}
        <Card flush>
          <FilterBar>
            <SearchInput
              label={searchLabel}
              placeholder={searchLabel}
              value={listState.search}
              onChange={(event) => listState.setSearch(event.target.value)}
            />
            <Select
              aria-label="Estado"
              value={listState.status}
              onChange={(event) =>
                listState.setStatus(event.target.value as RecordStatus | '')
              }
            >
              <option value="">Todos los estados</option>
              <option value="ACTIVE">Activos</option>
              <option value="INACTIVE">Inactivos</option>
            </Select>
          </FilterBar>
          {content}
        </Card>
      </div>

      {form.mode === 'open' &&
        renderForm({
          record: form.record,
          onCancel: () => setForm({ mode: 'closed' }),
          onSaved: (_record, outcome) => {
            setForm({ mode: 'closed' });
            if (outcome === 'unchanged') {
              notify('No había cambios para guardar.', 'info');
              return;
            }
            notify(
              `${capitalize(labels.singular)} ${outcome === 'created' ? 'cread' : 'actualizad'}${done}.`,
            );
            listState.reload();
          },
        })}

      <ConfirmDialog
        open={confirming !== null}
        title={`¿Desactivar ${labels.singular}?`}
        description={`"${confirming?.name ?? ''}" dejará de estar disponible para nuevas operaciones. Podrás activarl${done} nuevamente.`}
        confirmLabel="Desactivar"
        tone="danger"
        loading={confirming !== null && pendingId === confirming.id}
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          if (confirming) void changeStatus(confirming, 'INACTIVE');
        }}
      />
    </>
  );
}
