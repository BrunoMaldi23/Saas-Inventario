type OptionsHintProps = {
  label: string;
  loading: boolean;
  failed: boolean;
  truncated: boolean;
  allowed: boolean;
};

/** Aviso bajo un select de referencias cuando la lista no está completa. */
export function optionsHint({
  label,
  loading,
  failed,
  truncated,
  allowed,
}: OptionsHintProps): string | undefined {
  if (!allowed) return `Tu rol no puede consultar ${label}.`;
  if (loading) return `Cargando ${label}…`;
  if (failed)
    return `No pudimos cargar ${label}. Cierra y vuelve a intentarlo.`;
  if (truncated) return `Se muestran las primeras 100 ${label}.`;
  return undefined;
}
