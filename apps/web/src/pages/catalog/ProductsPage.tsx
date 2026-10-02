import {
  createProduct,
  listCategories,
  listProducts,
  updateProduct,
} from '@inventario/api-client';
import type { Column } from '../../components/ui/DataTable';
import { Field, Input, Select } from '../../components/ui/Field';
import { RecordStatusBadge } from '../../components/ui/RecordStatusBadge';
import { Notice } from '../../components/ui/States';
import type { Product } from '@inventario/types';
import { Permission } from '../../lib/permissions';
import {
  CatalogListPage,
  type EntityLabels,
  type FormRenderProps,
} from '../../features/catalog/CatalogListPage';
import { EntityFormDialog } from '../../features/catalog/EntityFormDialog';
import { formatDecimal } from '../../features/catalog/format';
import { optionsHint } from '../../features/catalog/optionsHint';
import { productSpec } from '../../features/catalog/specs';
import { useCatalogOptions } from '../../features/catalog/useCatalogOptions';
import { useEntityForm } from '../../features/catalog/useEntityForm';

const labels: EntityLabels = {
  singular: 'producto',
  plural: 'productos',
  gender: 'm',
  conflict: 'Ya existe un producto con ese SKU o código de barras.',
  notFound:
    'El producto o la categoría seleccionada ya no está disponible. Actualiza la lista e inténtalo nuevamente.',
};

const UNIT_SUGGESTIONS = ['Unidad', 'Caja', 'Paquete', 'Kg', 'Litro', 'Metro'];

const setStatus = (id: string, status: Product['status']) =>
  updateProduct(id, { status });

function ProductForm({ record, onCancel, onSaved }: FormRenderProps<Product>) {
  const categories = useCatalogOptions(
    listCategories,
    Permission.CategoriesRead,
  );
  const form = useEntityForm({
    spec: productSpec,
    record,
    create: createProduct,
    update: updateProduct,
    messages: labels,
    onSaved,
  });
  const { values, setField, fieldError } = form;

  return (
    <EntityFormDialog
      title={record ? 'Editar producto' : 'Nuevo producto'}
      submitLabel={record ? 'Guardar cambios' : 'Crear producto'}
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
      <div className="form-row">
        <Field
          label="SKU"
          hint="Opcional. Único en tu cuenta."
          error={fieldError('sku')}
        >
          {(props) => (
            <Input
              {...props}
              value={values.sku}
              maxLength={80}
              autoCapitalize="characters"
              onChange={(e) => setField('sku', e.target.value)}
            />
          )}
        </Field>
        <Field
          label="Código de barras"
          hint="Opcional."
          error={fieldError('barcode')}
        >
          {(props) => (
            <Input
              {...props}
              value={values.barcode}
              maxLength={80}
              inputMode="text"
              onChange={(e) => setField('barcode', e.target.value)}
            />
          )}
        </Field>
      </div>
      <div className="form-row">
        <Field
          label="Categoría"
          hint={optionsHint({ label: 'categorías', ...categories })}
          error={fieldError('categoryId')}
        >
          {(props) => (
            <Select
              {...props}
              value={values.categoryId}
              onChange={(e) => setField('categoryId', e.target.value)}
            >
              <option value="">Sin categoría</option>
              {categories.selectable(record?.categoryId).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.status === 'INACTIVE' ? ' (inactiva)' : ''}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Unidad de medida" error={fieldError('unitOfMeasure')}>
          {(props) => (
            <>
              <Input
                {...props}
                value={values.unitOfMeasure}
                maxLength={32}
                list="unit-suggestions"
                onChange={(e) => setField('unitOfMeasure', e.target.value)}
              />
              <datalist id="unit-suggestions">
                {UNIT_SUGGESTIONS.map((unit) => (
                  <option key={unit} value={unit} />
                ))}
              </datalist>
            </>
          )}
        </Field>
      </div>
      <Field
        label="Stock mínimo"
        hint="Opcional. Umbral para alertas futuras; no es stock disponible."
        error={fieldError('minStock')}
      >
        {(props) => (
          <Input
            {...props}
            value={values.minStock}
            inputMode="decimal"
            onChange={(e) => setField('minStock', e.target.value)}
          />
        )}
      </Field>
      <Field
        label="Descripción"
        hint="Opcional."
        error={fieldError('description')}
      >
        {(props) => (
          <textarea
            {...props}
            className="control control--textarea"
            rows={3}
            maxLength={2000}
            value={values.description}
            onChange={(e) => setField('description', e.target.value)}
          />
        )}
      </Field>
    </EntityFormDialog>
  );
}

export function ProductsPage() {
  const columns: Column<Product>[] = [
    {
      key: 'name',
      header: 'Producto',
      primary: true,
      render: (p) => <span className="cell-strong">{p.name}</span>,
    },
    {
      key: 'sku',
      header: 'SKU',
      render: (p) => (p.sku ? <code>{p.sku}</code> : '—'),
    },
    {
      key: 'barcode',
      header: 'Código de barras',
      hideOnMobile: true,
      render: (p) => p.barcode ?? '—',
    },
    {
      key: 'category',
      header: 'Categoría',
      render: (p) => p.category?.name ?? '—',
    },
    { key: 'unit', header: 'Unidad', render: (p) => p.unitOfMeasure },
    {
      key: 'minStock',
      header: 'Stock mínimo',
      align: 'end',
      hideOnMobile: true,
      render: (p) => formatDecimal(p.minStock),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (p) => <RecordStatusBadge status={p.status} />,
    },
  ];

  return (
    <CatalogListPage
      title="Productos"
      description="Catálogo de productos de la cuenta activa."
      labels={labels}
      readPermission={Permission.ProductsRead}
      writePermission={Permission.ProductsWrite}
      list={listProducts}
      setStatus={setStatus}
      columns={columns}
      searchLabel="Buscar por nombre, SKU o código de barras"
      icon="box"
      notice={
        <Notice tone="info">
          El stock disponible aparecerá cuando se habilite el módulo de
          inventario. El stock mínimo es solo un umbral de referencia.
        </Notice>
      }
      renderForm={(props) => <ProductForm {...props} />}
    />
  );
}
