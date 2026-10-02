import { useCallback, useState } from 'react';
import { classifyApiError } from '../../lib/apiError';
import { useSession } from '../../session/sessionContext';
import { mutationErrorMessage, type EntityMessages } from './catalogLogic';
import { diffPayload, type FieldErrors, type FormSpec } from './formUtils';

export type SaveOutcome = 'created' | 'updated' | 'unchanged';

type Options<V, P, R> = {
  spec: FormSpec<V, P, R>;
  /** Registro a editar; null para crear. */
  record: R | null;
  create: (payload: P) => Promise<R>;
  /** Opcional en formularios que solo crean. */
  update?: (id: string, changes: Partial<P>) => Promise<R>;
  messages: EntityMessages;
  onSaved: (record: R, outcome: SaveOutcome) => void;
};

/**
 * Estado y envío de un formulario de catálogo: validación local, PATCH solo
 * con campos modificados y errores del backend traducidos para el usuario.
 */
export function useEntityForm<
  V extends Record<string, string>,
  P extends Record<string, unknown>,
  R extends { id: string },
>({ spec, record, create, update, messages, onSaved }: Options<V, P, R>) {
  const { expireSession } = useSession();
  const [values, setValues] = useState<V>(() =>
    record ? spec.fromRecord(record) : spec.empty,
  );
  const [errors, setErrors] = useState<FieldErrors<V>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const setField = useCallback(<K extends keyof V>(key: K, value: V[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }, []);

  const submit = async () => {
    const result = spec.validate(values);
    setFormError(null);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});

    let changes: Partial<P> = result.payload;
    if (record) {
      const initial = spec.validate(spec.fromRecord(record));
      if (initial.ok) changes = diffPayload(initial.payload, result.payload);
      if (Object.keys(changes).length === 0) {
        onSaved(record, 'unchanged');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (record && !update) throw new Error('Formulario sin edición.');
      const saved =
        record && update
          ? await update(record.id, changes)
          : await create(result.payload);
      onSaved(saved, record ? 'updated' : 'created');
    } catch (error) {
      const kind = classifyApiError(error);
      if (kind === 'unauthorized') {
        expireSession();
        return;
      }
      setFormError(mutationErrorMessage(kind, messages));
      setSubmitting(false);
    }
  };

  /** Props comunes para <Field>: error del campo. */
  const fieldError = (key: keyof V) => errors[key];

  return {
    values,
    setField,
    fieldError,
    formError,
    submitting,
    submit,
  };
}
