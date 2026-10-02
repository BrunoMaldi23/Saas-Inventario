import { useState } from 'react';
import { Badge } from '../components/ui/Badge';
import { Button, IconButton } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DataTable, type Column } from '../components/ui/DataTable';
import { ConfirmDialog } from '../components/ui/Dialog';
import { Field, Input, SearchInput, Select } from '../components/ui/Field';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
  Skeleton,
} from '../components/ui/States';
import { useToast } from '../components/ui/toastContext';

type Row = { id: string; name: string };
const columns: Column<Row>[] = [
  { key: 'name', header: 'Nombre', primary: true, render: (r) => r.name },
  { key: 'other', header: 'Detalle', render: () => '—' },
];

/** Catálogo visual del design system. Solo se registra en desarrollo. */
export function ComponentsPage() {
  const { notify } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <PageHeader
        title="Catálogo de componentes"
        description="Referencia visual del design system. Solo visible en desarrollo."
        meta={<Badge tone="warning">DEV</Badge>}
      />
      <div className="stack">
        <Card title="Botones">
          <div className="cluster">
            <Button variant="primary" icon="plus">
              Primario
            </Button>
            <Button>Secundario</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger" onClick={() => setConfirmOpen(true)}>
              Peligro
            </Button>
            <Button loading>Cargando</Button>
            <Button disabled>Deshabilitado</Button>
            <Button size="sm">Pequeño</Button>
            <IconButton icon="refresh" label="Actualizar" variant="secondary" />
          </div>
        </Card>

        <Card title="Badges">
          <div className="cluster">
            <Badge>Neutral</Badge>
            <Badge tone="info" dot>
              Info
            </Badge>
            <Badge tone="success" dot>
              Éxito
            </Badge>
            <Badge tone="warning" dot>
              Advertencia
            </Badge>
            <Badge tone="danger" dot>
              Error
            </Badge>
          </div>
        </Card>

        <Card title="Formularios">
          <div className="form-grid">
            <div className="form-row">
              <Field label="Texto" hint="Texto de ayuda.">
                {(p) => <Input {...p} />}
              </Field>
              <Field label="Con error" error="Este campo es obligatorio.">
                {(p) => <Input {...p} />}
              </Field>
            </div>
            <div className="form-row">
              <Field label="Selección">
                {(p) => (
                  <Select {...p}>
                    <option>Opción A</option>
                    <option>Opción B</option>
                  </Select>
                )}
              </Field>
              <div className="field">
                <span className="field__label">Búsqueda</span>
                <SearchInput label="Buscar" placeholder="Buscar…" />
              </div>
            </div>
          </div>
        </Card>

        <Card title="Avisos y notificaciones">
          <div className="stack">
            <Notice tone="success" title="Éxito">
              Operación completada.
            </Notice>
            <Notice tone="warning">Advertencia sin título.</Notice>
            <Notice tone="danger" title="Error">
              Algo falló.
            </Notice>
            <div className="cluster">
              <Button onClick={() => notify('Cambios guardados.')}>
                Toast éxito
              </Button>
              <Button onClick={() => notify('No se pudo guardar.', 'danger')}>
                Toast error
              </Button>
            </div>
          </div>
        </Card>

        <div className="stat-grid">
          <StatCard label="Con valor" value="1.234" icon="box" hint="Ejemplo" />
          <StatCard label="Sin datos" value={null} icon="layers" />
          <StatCard label="Cargando" value={null} icon="chart" loading />
        </div>

        <div className="dashboard-grid">
          <Card title="Loading">
            <LoadingState />
          </Card>
          <Card title="Empty">
            <EmptyState
              compact
              title="Sin registros"
              description="Descripción breve."
            />
          </Card>
          <Card title="Error">
            <ErrorState onRetry={() => notify('Reintentando…', 'info')} />
          </Card>
          <Card title="Skeleton">
            <div className="stack">
              <Skeleton width="60%" />
              <Skeleton />
              <Skeleton width="80%" />
            </div>
          </Card>
        </div>

        <Card title="Tabla cargando" flush>
          <DataTable
            caption="Ejemplo"
            columns={columns}
            rows={[]}
            getRowId={(r) => r.id}
            status="loading"
            skeletonRows={3}
          />
        </Card>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="¿Eliminar elemento?"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        tone="danger"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          notify('Elemento eliminado (demostración).');
        }}
      />
    </>
  );
}
