import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { LowStockReportTab } from '../features/reports/LowStockReportTab';
import { MovementReportTab } from '../features/reports/MovementReportTab';
import { StockReportTab } from '../features/reports/StockReportTab';
import {
  ProductReportTab,
  WarehouseReportTab,
} from '../features/reports/SummaryReportTabs';
import { cx } from '../lib/cx';

const tabs = [
  { key: 'stock', label: 'Stock actual', render: () => <StockReportTab /> },
  { key: 'low', label: 'Bajo mínimo', render: () => <LowStockReportTab /> },
  {
    key: 'movements',
    label: 'Movimientos',
    render: () => <MovementReportTab />,
  },
  {
    key: 'warehouses',
    label: 'Por bodega',
    render: () => <WarehouseReportTab />,
  },
  {
    key: 'products',
    label: 'Por producto',
    render: () => <ProductReportTab />,
  },
] as const;

type TabKey = (typeof tabs)[number]['key'];

/** Reportes de Fase 5: cada pestaña consulta su endpoint de /reports. */
export function ReportsPage() {
  const [active, setActive] = useState<TabKey>('stock');
  const baseId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const current = tabs.find((t) => t.key === active) ?? tabs[0];

  // Navegación con flechas entre pestañas (patrón ARIA tabs).
  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const delta =
      event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (index + delta + tabs.length) % tabs.length;
    const tab = tabs[next];
    if (!tab) return;
    setActive(tab.key);
    tabRefs.current[next]?.focus();
  };

  return (
    <>
      <PageHeader
        title="Reportes"
        description="Visibilidad de stock y movimientos calculada por el servidor. Las fechas se expresan en UTC."
      />
      <Card flush>
        <div className="tabs" role="tablist" aria-label="Reportes">
          {tabs.map((tab, index) => (
            <button
              key={tab.key}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.key}`}
              aria-selected={tab.key === active}
              aria-controls={`${baseId}-panel`}
              tabIndex={tab.key === active ? 0 : -1}
              className={cx('tab', tab.key === active && 'is-active')}
              onClick={() => setActive(tab.key)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div
          id={`${baseId}-panel`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${current.key}`}
        >
          {/* key: cada pestaña parte con sus filtros y datos propios. */}
          <div key={current.key}>{current.render()}</div>
        </div>
      </Card>
    </>
  );
}
