const decimalFormat = new Intl.NumberFormat('es-CL', {
  maximumFractionDigits: 3,
});

/** Muestra un decimal del contrato ("2.5") con formato local ("2,5"). */
export function formatDecimal(value: string | null): string {
  if (value === null) return '—';
  const number = Number(value);
  return Number.isFinite(number) ? decimalFormat.format(number) : value;
}
