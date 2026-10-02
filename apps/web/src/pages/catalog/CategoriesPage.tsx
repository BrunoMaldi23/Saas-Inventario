import {
  createCategory,
  listCategories,
  updateCategory,
} from '@inventario/api-client';
import type { Column } from '../../components/ui/DataTable';
import { Field, Input, Select } from '../../components/ui/Field';
import { RecordStatusBadge } from '../../components/ui/RecordStatusBadge';
import type { Category } from '@inventario/types';
import { Permission } from '../../lib/permissions';
import { parentCandidates } from '../../features/catalog/catalogLogic';
import {
  CatalogListPage,
  type EntityLabels,
  type FormRenderProps,
} from '../../features/catalog/CatalogListPage';
import { EntityFormDialog } from '../../features/catalog/EntityFormDialog';
import { optionsHint } from '../../features/catalog/optionsHint';
import { categorySpec } from '../../features/catalog/specs';
import { useCatalogOptions } from '../../features/catalog/useCatalogOptions';
import { useEntityForm } from '../../features/catalog/useEntityForm';

const labels: EntityLabels = {
  singular: 'categoría',
  plural: 'categorías',
  gender: 'f',
  conflict:
    'Ya existe una categoría con ese nombre en el mismo nivel (misma categoría padre).',
  notFound:
    'La categoría o la categoría padre ya no está disponible. Actualiza la lista e inténtalo nuevamente.',
};

const setStatus = (id: string, status: Category['status']) =>
  updateCategory(id, { status });

function CategoryForm({
  record,
  onCancel,
  onSaved,
}: FormRenderProps<Category>) {
  const categories = useCatalogOptions(
    listCategories,
    Permission.CategoriesRead,
  );
  const form = useEntityForm({
    spec: categorySpec,
    record,
    create: createCategory,
    update: updateCategory,
    messages: labels,
    onSaved,
  });
  const { values, setField, fieldError } = form;
  const candidates = parentCandidates(categories.items, record?.id ?? null);
  // Si el padre actual quedó inactivo se conserva visible para no perderlo.
  const currentParent = record?.parentId
    ? categories.items.find((c) => c.id === record.parentId)
    : undefined;
  const options =
    currentParent && !candidates.includes(currentParent)
      ? [...candidates, currentParent]
      : candidates;

  return (
    <EntityFormDialog
      title={record ? 'Editar categoría' : 'Nueva categoría'}
      submitLabel={record ? 'Guardar cambios' : 'Crear categoría'}
      submitting={form.submitting}
      formError={form.formError}
      onSubmit={() => void form.submit()}
      onCancel={onCancel}
    >
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
        label="Categoría padre"
        hint={
          optionsHint({ label: 'categorías', ...categories }) ??
          'Opcional. Déjala vacía para una categoría principal.'
        }
        error={fieldError('parentId')}
      >
        {(props) => (
          <Select
            {...props}
            value={values.parentId}
            onChange={(e) => setField('parentId', e.target.value)}
          >
            <option value="">Ninguna (categoría principal)</option>
            {options.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.status === 'INACTIVE' ? ' (inactiva)' : ''}
              </option>
            ))}
          </Select>
        )}
      </Field>
    </EntityFormDialog>
  );
}

export function CategoriesPage() {
  const columns: Column<Category>[] = [
    {
      key: 'name',
      header: 'Categoría',
      primary: true,
      render: (c) => <span className="cell-strong">{c.name}</span>,
    },
    {
      key: 'parent',
      header: 'Categoría padre',
      render: (c) => (c.parentId ? (c.parent?.name ?? '—') : 'Principal'),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (c) => <RecordStatusBadge status={c.status} />,
    },
  ];

  return (
    <CatalogListPage
      title="Categorías"
      description="Clasificación de productos. Una categoría puede tener una categoría padre."
      labels={labels}
      readPermission={Permission.CategoriesRead}
      writePermission={Permission.CategoriesWrite}
      list={listCategories}
      setStatus={setStatus}
      columns={columns}
      searchLabel="Buscar categoría por nombre"
      icon="layers"
      renderForm={(props) => <CategoryForm {...props} />}
    />
  );
}
