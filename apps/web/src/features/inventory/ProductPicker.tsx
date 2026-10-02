import { useCallback, useState } from 'react';
import { listProducts } from '@inventario/api-client';
import { Field, SearchInput, Select } from '../../components/ui/Field';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import { useApiQuery } from '../../session/useApiQuery';

export type ProductOption = {
  id: string;
  name: string;
  sku: string | null;
  unitOfMeasure?: string;
};

type ProductPickerProps = {
  label: string;
  value: string;
  onChange: (product: ProductOption | null) => void;
  /** Producto ya conocido (p. ej. al operar desde una fila). */
  initial?: ProductOption | null;
  error?: string;
  /** Texto de la opción vacía; si se omite, la opción vacía no se puede elegir. */
  emptyLabel?: string;
  /** Solo productos activos (las operaciones no admiten inactivos). */
  activeOnly?: boolean;
};

const RESULTS = 20;
const optionText = (p: ProductOption) =>
  p.sku ? `${p.name} · ${p.sku}` : p.name;

/**
 * Selector de producto con búsqueda en el servidor (nombre, SKU o código de
 * barras), sin cargar el catálogo completo.
 */
export function ProductPicker({
  label,
  value,
  onChange,
  initial = null,
  error,
  emptyLabel,
  activeOnly = false,
}: ProductPickerProps) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ProductOption | null>(initial);
  const term = useDebouncedValue(search.trim());
  const fetcher = useCallback(
    () =>
      listProducts({
        page: 1,
        pageSize: RESULTS,
        search: term || undefined,
        status: activeOnly ? 'ACTIVE' : undefined,
      }),
    [term, activeOnly],
  );
  const { state } = useApiQuery(fetcher);
  const results: ProductOption[] =
    state.status === 'success' ? state.data.items : [];
  const options =
    selected && !results.some((p) => p.id === selected.id)
      ? [selected, ...results]
      : results;
  const total = state.status === 'success' ? state.data.total : 0;

  const hint =
    state.status === 'loading'
      ? 'Buscando productos…'
      : state.status === 'error'
        ? 'No pudimos cargar productos.'
        : total > RESULTS
          ? `Mostrando ${RESULTS} de ${total}. Escribe para afinar la búsqueda.`
          : results.length === 0
            ? 'Sin productos que coincidan.'
            : undefined;

  return (
    <Field label={label} error={error} hint={hint}>
      {(props) => (
        <div className="picker">
          <SearchInput
            label={`Buscar ${label.toLowerCase()} por nombre, SKU o código`}
            placeholder="Buscar por nombre, SKU o código"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Select
            {...props}
            value={value}
            onChange={(event) => {
              const product =
                options.find((p) => p.id === event.target.value) ?? null;
              setSelected(product);
              onChange(product);
            }}
          >
            <option value="" disabled={!emptyLabel}>
              {emptyLabel ?? 'Selecciona un producto'}
            </option>
            {options.map((p) => (
              <option key={p.id} value={p.id}>
                {optionText(p)}
              </option>
            ))}
          </Select>
        </div>
      )}
    </Field>
  );
}
