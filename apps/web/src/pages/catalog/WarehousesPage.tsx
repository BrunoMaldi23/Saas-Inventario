import {
  createWarehouse,
  listBranches,
  listWarehouses,
  updateWarehouse,
} from '@inventario/api-client';
import type { Column } from '../../components/ui/DataTable';
import { Field, Input, Select } from '../../components/ui/Field';
import { RecordStatusBadge } from '../../components/ui/RecordStatusBadge';
import { Notice } from '../../components/ui/States';
import type { Warehouse } from '@inventario/types';
import { Permission } from '../../lib/permissions';
import {
  CatalogListPage,
  type EntityLabels,
  type FormRenderProps,
} from '../../features/catalog/CatalogListPage';
import { EntityFormDialog } from '../../features/catalog/EntityFormDialog';
import { optionsHint } from '../../features/catalog/optionsHint';
import { warehouseSpec } from '../../features/catalog/specs';
import { useCatalogOptions } from '../../features/catalog/useCatalogOptions';
import { useEntityForm } from '../../features/catalog/useEntityForm';

const labels: EntityLabels = {
  singular: 'bodega',
  plural: 'bodegas',
  gender: 'f',
  conflict: 'Ya existe una bodega con ese nombre en la sucursal seleccionada.',
  notFound:
    'La bodega o la sucursal seleccionada ya no está disponible. Actualiza la lista e inténtalo nuevamente.',
};

/** Sugerencias de tipo; el contrato admite texto libre (1–40 caracteres). */
const TYPE_SUGGESTIONS = [
  'Principal',
  'Sala de venta',
  'Tránsito',
  'Devoluciones',
];

const setStatus = (id: string, status: Warehouse['status']) =>
  updateWarehouse(id, { status });

function WarehouseForm({
  record,
  onCancel,
  onSaved,
}: FormRenderProps<Warehouse>) {
  const branches = useCatalogOptions(listBranches, Permission.BranchesRead);
  const form = useEntityForm({
    spec: warehouseSpec,
    record,
    create: createWarehouse,
    update: updateWarehouse,
    messages: labels,
    onSaved,
  });
  const { values, setField, fieldError } = form;

  return (
    <EntityFormDialog
      title={record ? 'Editar bodega' : 'Nueva bodega'}
      submitLabel={record ? 'Guardar cambios' : 'Crear bodega'}
      submitting={form.submitting}
      formError={form.formError}
      onSubmit={() => void form.submit()}
      onCancel={onCancel}
    >
      {branches.allowed &&
        !branches.loading &&
        branches.selectable().length === 0 && (
          <Notice tone="warning">
            No hay sucursales activas. Registra una sucursal antes de crear
            bodegas.
          </Notice>
        )}
      <Field label="Nombre" error={fieldError('name')}>
        {(props) => (
          <Input
            {...props}
            value={values.name}
            maxLength={120}
            onChange={(e) => setField('name', e.target.value)}
            autoFocus
          />
        )}
      </Field>
      <Field
        label="Sucursal"
        hint={optionsHint({ label: 'sucursales', ...branches })}
        error={fieldError('branchId')}
      >
        {(props) => (
          <Select
            {...props}
            value={values.branchId}
            onChange={(e) => setField('branchId', e.target.value)}
          >
            <option value="" disabled>
              Selecciona una sucursal
            </option>
            {branches.selectable(record?.branchId).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
                {b.status === 'INACTIVE' ? ' (inactiva)' : ''}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Tipo" error={fieldError('type')}>
        {(props) => (
          <>
            <Input
              {...props}
              value={values.type}
              maxLength={40}
              list="warehouse-type-suggestions"
              onChange={(e) => setField('type', e.target.value)}
            />
            <datalist id="warehouse-type-suggestions">
              {TYPE_SUGGESTIONS.map((type) => (
                <option key={type} value={type} />
              ))}
            </datalist>
          </>
        )}
      </Field>
    </EntityFormDialog>
  );
}

export function WarehousesPage() {
  const columns: Column<Warehouse>[] = [
    {
      key: 'name',
      header: 'Bodega',
      primary: true,
      render: (w) => <span className="cell-strong">{w.name}</span>,
    },
    {
      key: 'branch',
      header: 'Sucursal',
      render: (w) => w.branch.name,
    },
    { key: 'type', header: 'Tipo', render: (w) => w.type },
    {
      key: 'status',
      header: 'Estado',
      render: (w) => <RecordStatusBadge status={w.status} />,
    },
  ];

  return (
    <CatalogListPage
      title="Bodegas"
      description="Ubicaciones donde se almacena el inventario, agrupadas por sucursal."
      labels={labels}
      readPermission={Permission.WarehousesRead}
      writePermission={Permission.WarehousesWrite}
      list={listWarehouses}
      setStatus={setStatus}
      columns={columns}
      searchLabel="Buscar bodega por nombre"
      icon="warehouse"
      renderForm={(props) => <WarehouseForm {...props} />}
    />
  );
}
