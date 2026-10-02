import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { Skeleton } from './States';

type StatCardProps = {
  label: string;
  /** null = sin dato disponible (se muestra un guion, nunca un valor inventado). */
  value: ReactNode | null;
  icon: IconName;
  hint?: ReactNode;
  loading?: boolean;
};

export function StatCard({
  label,
  value,
  icon,
  hint,
  loading = false,
}: StatCardProps) {
  return (
    <article className="stat-card">
      <div className="stat-card__top">
        <p className="stat-card__label">{label}</p>
        <span className="stat-card__icon">
          <Icon name={icon} size={18} />
        </span>
      </div>
      <p className="stat-card__value">
        {loading ? (
          <Skeleton width="4rem" height="1.75rem" />
        ) : value === null ? (
          <span className="stat-card__empty" aria-label="Sin datos">
            —
          </span>
        ) : (
          value
        )}
      </p>
      {hint && <p className="stat-card__hint">{hint}</p>}
    </article>
  );
}
