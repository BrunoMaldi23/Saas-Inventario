import { Badge, type Tone } from '../../components/ui/Badge';
import type { ServiceStatus } from './useSystemHealth';

const tones: Record<ServiceStatus, Tone> = {
  checking: 'neutral',
  online: 'success',
  offline: 'danger',
};

const labels: Record<ServiceStatus, string> = {
  checking: 'Verificando',
  online: 'En línea',
  offline: 'Sin conexión',
};

export function ServiceStatusBadge({ status }: { status: ServiceStatus }) {
  return (
    <Badge tone={tones[status]} dot>
      {labels[status]}
    </Badge>
  );
}
