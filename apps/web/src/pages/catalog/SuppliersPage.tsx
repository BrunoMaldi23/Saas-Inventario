import {
  createSupplier,
  listSuppliers,
  updateSupplier,
} from '@inventario/api-client';
import type { Column } from '../../components/ui/DataTable';
import { Field, Input } from '../../components/ui/Field';
import { RecordStatusBadge } from '../../components/ui/RecordStatusBadge';
import type { Supplier } from '../../lib/apiTypes';
import { Permission } from '../../lib/permissions';
import {
  CatalogListPage,
  type EntityLabels,
  type FormRenderProps,
} from '../../features/catalog/CatalogListPage';
import { EntityFormDialog } from '../../features/catalog/EntityFormDialog';
import { supplierSpec } from '../../features/catalog/specs';
import { useEntityForm } from '../../features/catalog/useEntityForm';

const labels: EntityLabels = {
  singular: 'proveedor',
  plural: 'proveedores',
  gender: 'm',
  conflict: 'Ya existe un proveedor con esos datos.',
  notFound: 'El proveedor ya no está disponible. Actualiza la lista.',
};

const setStatus = (id: string, status: Supplier['status']) =>
  updateSupplier(id, { status });

function SupplierForm({
  record,
  onCancel,
  onSaved,
}: FormRenderProps<Supplier>) {
  const form = useEntityForm({
    spec: supplierSpec,
    record,
    create: createSupplier,
    update: updateSupplier,
    messages: labels,
    onSaved,
  });
  const { values, setField, fieldError } = form;

  return (
    <EntityFormDialog
      title={record ? 'Editar proveedor' : 'Nuevo proveedor'}
      submitLabel={record ? 'Guardar cambios' : 'Crear proveedor'}
      submitting={form.submitting}
      formError={form.formError}
      onSubmit={() => void form.submit()}
      onCancel={onCancel}
    >
      <Field label="Nombre o razón social" error={fieldError('name')}>
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
        label="Identificación tributaria"
        hint="Opcional. Por ejemplo, RUT."
        error={fieldError('taxId')}
      >
        {(props) => (
          <Input
            {...props}
            value={values.taxId}
            maxLength={40}
            onChange={(e) => setField('taxId', e.target.value)}
          />
        )}
      </Field>
      <div className="form-row">
        <Field label="Correo" hint="Opcional." error={fieldError('email')}>
          {(props) => (
            <Input
              {...props}
              type="email"
              inputMode="email"
              autoComplete="off"
              value={values.email}
              maxLength={254}
              onChange={(e) => setField('email', e.target.value)}
            />
          )}
        </Field>
        <Field label="Teléfono" hint="Opcional." error={fieldError('phone')}>
          {(props) => (
            <Input
              {...props}
              type="tel"
              inputMode="tel"
              value={values.phone}
              maxLength={40}
              onChange={(e) => setField('phone', e.target.value)}
            />
          )}
        </Field>
      </div>
    </EntityFormDialog>
  );
}

const columns: Column<Supplier>[] = [
  {
    key: 'name',
    header: 'Proveedor',
    primary: true,
    render: (s) => <span className="cell-strong">{s.name}</span>,
  },
  { key: 'taxId', header: 'Id. tributaria', render: (s) => s.taxId ?? '—' },
  {
    key: 'email',
    header: 'Correo',
    hideOnMobile: true,
    render: (s) => s.email ?? '—',
  },
  { key: 'phone', header: 'Teléfono', render: (s) => s.phone ?? '—' },
  {
    key: 'status',
    header: 'Estado',
    render: (s) => <RecordStatusBadge status={s.status} />,
  },
];

export function SuppliersPage() {
  return (
    <CatalogListPage
      title="Proveedores"
      description="Empresas y contactos que abastecen tu inventario."
      labels={labels}
      readPermission={Permission.SuppliersRead}
      writePermission={Permission.SuppliersWrite}
      list={listSuppliers}
      setStatus={setStatus}
      columns={columns}
      searchLabel="Buscar proveedor por nombre"
      icon="truck"
      renderForm={(props) => <SupplierForm {...props} />}
    />
  );
}
