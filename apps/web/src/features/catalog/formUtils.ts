/** Errores por campo de un formulario. */
export type FieldErrors<V> = Partial<Record<keyof V, string>>;

export type Validation<V, P> =
  | { ok: true; payload: P }
  | { ok: false; errors: FieldErrors<V> };

/**
 * Especificación de un formulario de catálogo: valores de texto editables,
 * conversión desde el registro y validación que produce el payload de la API.
 */
export type FormSpec<V, P, R> = {
  empty: V;
  fromRecord: (record: R) => V;
  validate: (values: V) => Validation<V, P>;
};

/** Texto opcional: recorta espacios; vacío se envía como null (limpia el campo). */
export function textOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * Campos que cambiaron entre dos payloads. PATCH solo recibe esos campos, así
 * una referencia sin cambios no se revalida (p. ej. una categoría ya inactiva).
 */
export function diffPayload<P extends Record<string, unknown>>(
  before: P,
  after: P,
): Partial<P> {
  const diff: Partial<P> = {};
  for (const key of Object.keys(after) as Array<keyof P>) {
    if ((before[key] ?? null) !== (after[key] ?? null)) diff[key] = after[key];
  }
  return diff;
}

/** Helper para acumular errores y devolver la validación final. */
export function finish<V, P>(
  errors: FieldErrors<V>,
  payload: () => P,
): Validation<V, P> {
  return Object.keys(errors).length > 0
    ? { ok: false, errors }
    : { ok: true, payload: payload() };
}

export function checkRequired(value: string, max: number): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return 'Este campo es obligatorio.';
  if (trimmed.length > max) return `Máximo ${max} caracteres.`;
  return undefined;
}

export function checkOptional(value: string, max: number): string | undefined {
  return value.trim().length > max ? `Máximo ${max} caracteres.` : undefined;
}
