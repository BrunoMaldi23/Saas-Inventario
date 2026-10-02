import { Badge } from './Badge';

/** Estado ACTIVE/INACTIVE común a catálogo y membresías. */
export function RecordStatusBadge({
  status,
}: {
  status: 'ACTIVE' | 'INACTIVE';
}) {
  return status === 'ACTIVE' ? (
    <Badge tone="success" dot>
      Activo
    </Badge>
  ) : (
    <Badge dot>Inactivo</Badge>
  );
}
