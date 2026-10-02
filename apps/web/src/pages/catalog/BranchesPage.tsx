import {
  createBranch,
  listBranches,
  listCompanies,
  updateBranch,
} from '@inventario/api-client';
import type { Column } from '../../components/ui/DataTable';
import { Field, Input, Select } from '../../components/ui/Field';
import { RecordStatusBadge } from '../../components/ui/RecordStatusBadge';
import { Notice } from '../../components/ui/States';
import type { Branch } from '@inventario/types';
import { Permission } from '../../lib/permissions';
import {
  CatalogListPage,
  type EntityLabels,
  type FormRenderProps,
} from '../../features/catalog/CatalogListPage';
import { EntityFormDialog } from '../../features/catalog/EntityFormDialog';
import { optionsHint } from '../../features/catalog/optionsHint';
import { branchSpec } from '../../features/catalog/specs';
import { useCatalogOptions } from '../../features/catalog/useCatalogOptions';
import { useEntityForm } from '../../features/catalog/useEntityForm';

const labels: EntityLabels = {
  singular: 'sucursal',
  plural: 'sucursales',
  gender: 'f',
  conflict: 'Ya existe una sucursal con esos datos.',
  notFound:
    'La sucursal o la empresa seleccionada ya no está disponible. Actualiza la lista e inténtalo nuevamente.',
};

const setStatus = (id: string, status: Branch['status']) =>
  updateBranch(id, { status });

function BranchForm({ record, onCancel, onSaved }: FormRenderProps<Branch>) {
  const companies = useCatalogOptions(listCompanies, Permission.CompaniesRead);
  const form = useEntityForm({
    spec: branchSpec,
    record,
    create: createBranch,
    update: updateBranch,
    messages: labels,
    onSaved,
  });
  const { values, setField, fieldError } = form;

  return (
    <EntityFormDialog
      title={record ? 'Editar sucursal' : 'Nueva sucursal'}
      submitLabel={record ? 'Guardar cambios' : 'Crear sucursal'}
      submitting={form.submitting}
      formError={form.formError}
      onSubmit={() => void form.submit()}
      onCancel={onCancel}
    >
      {companies.allowed &&
        !companies.loading &&
        companies.selectable().length === 0 && (
          <Notice tone="warning">
            No hay empresas activas. Registra una empresa antes de crear
            sucursales.
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
        label="Empresa"
        hint={optionsHint({ label: 'empresas', ...companies })}
        error={fieldError('companyId')}
      >
        {(props) => (
          <Select
            {...props}
            value={values.companyId}
            onChange={(e) => setField('companyId', e.target.value)}
          >
            <option value="" disabled>
              Selecciona una empresa
            </option>
            {companies.selectable(record?.companyId).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.status === 'INACTIVE' ? ' (inactiva)' : ''}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Dirección" hint="Opcional." error={fieldError('address')}>
        {(props) => (
          <Input
            {...props}
            value={values.address}
            maxLength={250}
            autoComplete="street-address"
            onChange={(e) => setField('address', e.target.value)}
          />
        )}
      </Field>
    </EntityFormDialog>
  );
}

export function BranchesPage() {
  const columns: Column<Branch>[] = [
    {
      key: 'name',
      header: 'Sucursal',
      primary: true,
      render: (b) => <span className="cell-strong">{b.name}</span>,
    },
    {
      key: 'company',
      header: 'Empresa',
      render: (b) => b.company.name,
    },
    {
      key: 'address',
      header: 'Dirección',
      hideOnMobile: true,
      render: (b) => b.address ?? '—',
    },
    {
      key: 'status',
      header: 'Estado',
      render: (b) => <RecordStatusBadge status={b.status} />,
    },
  ];

  return (
    <CatalogListPage
      title="Sucursales"
      description="Puntos de operación de cada empresa. Las bodegas pertenecen a una sucursal."
      labels={labels}
      readPermission={Permission.BranchesRead}
      writePermission={Permission.BranchesWrite}
      list={listBranches}
      setStatus={setStatus}
      columns={columns}
      searchLabel="Buscar sucursal por nombre"
      icon="building"
      renderForm={(props) => <BranchForm {...props} />}
    />
  );
}
