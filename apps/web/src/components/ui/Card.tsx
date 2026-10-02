import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';

type CardProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  /** Sin padding interno: para tablas o listas a sangre. */
  flush?: boolean;
  className?: string;
  children: ReactNode;
};

export function Card({
  title,
  description,
  actions,
  flush = false,
  className,
  children,
}: CardProps) {
  return (
    <section className={cx('card', className)}>
      {(title || actions) && (
        <header className="card__header">
          <div>
            {title && <h2 className="card__title">{title}</h2>}
            {description && <p className="card__description">{description}</p>}
          </div>
          {actions && <div className="card__actions">{actions}</div>}
        </header>
      )}
      <div className={cx('card__body', flush && 'card__body--flush')}>
        {children}
      </div>
    </section>
  );
}
