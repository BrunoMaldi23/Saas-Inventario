const utcDateTime = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'UTC',
});

/** Fecha y hora en UTC: los reportes se definen en UTC en el servidor. */
export function formatUtc(iso: string): string {
  return `${utcDateTime.format(new Date(iso))} UTC`;
}
