import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/States';
import { navigate } from '../lib/router';

export function NotFoundPage() {
  return (
    <EmptyState
      icon="search"
      title="Página no encontrada"
      description="La dirección no existe o fue movida."
      action={
        <Button variant="primary" onClick={() => navigate('/')}>
          Ir al dashboard
        </Button>
      }
    />
  );
}
