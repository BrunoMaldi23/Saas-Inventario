import { useMemo, useState } from 'react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DataTable, type Column } from '../components/ui/DataTable';
import { Dialog } from '../components/ui/Dialog';
import { Field, Input, SearchInput, Select } from '../components/ui/Field';
import { FilterBar } from '../components/ui/FilterBar';
import { ModuleNotice } from '../components/ui/ModuleNotice';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState, Notice } from '../components/ui/States';
import { productsPreview, type ProductPreview } from '../mocks/productsPreview';

const columns: Column<ProductPreview>[] = [
  {
    key: 'name',
    header: 'Producto',
    primary: true,
    render: (p) => <span className="cell-strong">{p.name}</span>,
  },
  { key: 'sku', header: 'SKU', render: (p) => <code>{p.sku}</code> },
  { key: 'category', header: 'Categoría', render: (p) => p.category },
  { key: 'unit', header: 'Unidad', hideOnMobile: true, render: (p) => p.unit },
  {
    key: 'status',
    header: 'Estado',
    render: (p) =>
      p.active ? (
        <Badge tone="success" dot>
          Activo
        </Badge>
      ) : (
        <Badge dot>Inactivo</Badge>
      ),
  },
];

export function ProductsPage() {
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return productsPreview;
    return productsPreview.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term),
    );
  }, [query]);

  return (
    <>
      <PageHeader
        title="Productos"
        description="Catálogo común de productos del tenant activo."
        actions={
          <Button
            variant="primary"
            icon="plus"
            onClick={() => setFormOpen(true)}
          >
            Nuevo producto
          </Button>
        }
      />
      <div className="stack">
        <ModuleNotice phase={3}>
          Los registros mostrados son datos de ejemplo para visualizar la tabla;
          no provienen de la API.
        </ModuleNotice>
        <Card flush>
          <FilterBar>
            <SearchInput
              label="Buscar por nombre o SKU"
              placeholder="Buscar por nombre o SKU"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </FilterBar>
          <DataTable
            caption="Listado de productos"
            columns={columns}
            rows={rows}
            getRowId={(p) => p.id}
            empty={
              <EmptyState
                compact
                icon="search"
                title="Sin resultados"
                description="Ningún producto coincide con la búsqueda."
                action={
                  <Button onClick={() => setQuery('')}>Limpiar búsqueda</Button>
                }
              />
            }
          />
        </Card>
      </div>

      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Nuevo producto"
        footer={
          <>
            <Button onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button variant="primary" disabled>
              Guardar producto
            </Button>
          </>
        }
      >
        <form
          className="form-grid"
          onSubmit={(event) => event.preventDefault()}
        >
          <Notice tone="warning">
            Vista previa del formulario. Guardar se habilitará cuando exista la
            API de productos.
          </Notice>
          <Field label="Nombre">
            {(props) => <Input {...props} required />}
          </Field>
          <div className="form-row">
            <Field label="SKU" hint="Único dentro de tu empresa.">
              {(props) => <Input {...props} />}
            </Field>
            <Field label="Código de barras" hint="Opcional.">
              {(props) => <Input {...props} inputMode="numeric" />}
            </Field>
          </div>
          <div className="form-row">
            <Field label="Categoría">
              {(props) => (
                <Select {...props} defaultValue="">
                  <option value="" disabled>
                    Selecciona una categoría
                  </option>
                </Select>
              )}
            </Field>
            <Field label="Unidad de medida">
              {(props) => (
                <Select {...props} defaultValue="">
                  <option value="" disabled>
                    Selecciona una unidad
                  </option>
                </Select>
              )}
            </Field>
          </div>
        </form>
      </Dialog>
    </>
  );
}
