import {
  createCompany,
  listCompanies,
  updateCompany,
} from '@inventario/api-client';
import type { Column } from '../../components/ui/DataTable';
import { Field, Input } from '../../components/ui/Field';
import { RecordStatusBadge } from '../../components/ui/RecordStatusBadge';
import { Notice } from '../../components/ui/States';
import type { Company } from '../../lib/apiTypes';
import { Permission } from '../../lib/permissions';
import {
  CatalogListPage,
  type EntityLabels,
  type FormRenderProps,
} from '../../features/catalog/CatalogListPage';
import { EntityFormDialog } from '../../features/catalog/EntityFormDialog';
import { companySpec } from '../../features/catalog/specs';
import { useEntityForm } from '../../features/catalog/useEntityForm';

const labels: EntityLabels = {
  singular: 'empresa',
  plural: 'empresas',
  gender: 'f',
  conflict: 'Ya existe una empresa con esa identificación tributaria.',
  notFound: 'La empresa ya no está disponible. Actualiza la lista.',
};

const setStatus = (id: string, status: Company['status']) =>
  updateCompany(id, { status });

function CompanyForm({ record, onCancel, onSaved }: FormRenderProps<Company>) {
  const form = useEntityForm({
    spec: companySpec,
    record,
    create: createCompany,
    update: updateCompany,
    messages: labels,
    onSaved,
  });
  const { values, setField, fieldError } = form;

  return (
    <EntityFormDialog
      title={record ? 'Editar empresa' : 'Nueva empresa'}
      submitLabel={record ? 'Guardar cambios' : 'Crear empresa'}
      submitting={form.submitting}
      formError={form.formError}
      onSubmit={() => void form.submit()}
      onCancel={onCancel}
    >
      <Field label="Razón social o nombre" error={fieldError('name')}>
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
      <div className="form-row">
        <Field
          label="Identificación tributaria"
          hint="Opcional. Única en tu cuenta."
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
        <Field
          label="Rubro"
          hint="Opcional. Ej.: botillería, ferretería."
          error={fieldError('businessType')}
        >
          {(props) => (
            <Input
              {...props}
              value={values.businessType}
              maxLength={80}
              onChange={(e) => setField('businessType', e.target.value)}
            />
          )}
        </Field>
      </div>
    </EntityFormDialog>
  );
}

const columns: Column<Company>[] = [
  {
    key: 'name',
    header: 'Empresa',
    primary: true,
    render: (c) => <span className="cell-strong">{c.name}</span>,
  },
  { key: 'taxId', header: 'Id. tributaria', render: (c) => c.taxId ?? '—' },
  { key: 'business', header: 'Rubro', render: (c) => c.businessType ?? '—' },
  {
    key: 'status',
    header: 'Estado',
    render: (c) => <RecordStatusBadge status={c.status} />,
  },
];

export function CompaniesPage() {
  return (
    <CatalogListPage
      title="Empresas"
      description="Razones sociales que operan dentro de tu cuenta."
      labels={labels}
      readPermission={Permission.CompaniesRead}
      writePermission={Permission.CompaniesWrite}
      list={listCompanies}
      setStatus={setStatus}
      columns={columns}
      searchLabel="Buscar empresa por nombre"
      icon="building"
      notice={
        <Notice tone="info">
          Tu cuenta (el espacio de trabajo en InventarioSaaS) puede agrupar una
          o más empresas comerciales. Cada sucursal pertenece a una empresa.
        </Notice>
      }
      renderForm={(props) => <CompanyForm {...props} />}
    />
  );
}
