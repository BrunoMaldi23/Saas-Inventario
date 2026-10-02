import { Button } from '../components/ui/Button';
import { Icon, type IconName } from '../components/ui/Icon';
import { ModuleNotice } from '../components/ui/ModuleNotice';
import { PageHeader } from '../components/ui/PageHeader';

/** Reportes definidos para la Fase 5 en docs/BACKLOG.md. */
const reports: Array<{ title: string; description: string; icon: IconName }> = [
  {
    title: 'Stock actual',
    description: 'Existencias por producto y bodega a la fecha.',
    icon: 'layers',
  },
  {
    title: 'Movimientos por período',
    description:
      'Entradas, salidas, ajustes y transferencias en un rango de fechas.',
    icon: 'movements',
  },
  {
    title: 'Productos bajo mínimo',
    description: 'Productos cuyo stock está por debajo del umbral definido.',
    icon: 'alertTriangle',
  },
];

export function ReportsPage() {
  return (
    <>
      <PageHeader
        title="Reportes"
        description="Visibilidad operacional de stock y movimientos."
      />
      <div className="stack">
        <ModuleNotice phase={5} />
        <ul className="report-grid">
          {reports.map((report) => (
            <li key={report.title} className="report-card">
              <span className="report-card__icon">
                <Icon name={report.icon} size={20} />
              </span>
              <h2 className="report-card__title">{report.title}</h2>
              <p className="report-card__description">{report.description}</p>
              <Button size="sm" icon="chart" disabled>
                Generar
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
