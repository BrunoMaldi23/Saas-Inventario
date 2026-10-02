import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

type BadgeProps = {
  tone?: Tone;
  /** Muestra un punto de color; útil para estados. */
  dot?: boolean;
  children: ReactNode;
};

/** Etiqueta compacta. El color nunca es la única señal: siempre lleva texto. */
export function Badge({ tone = 'neutral', dot = false, children }: BadgeProps) {
  return (
    <span className={cx('badge', `badge--${tone}`)}>
      {dot && <span className="badge__dot" aria-hidden="true" />}
      {children}
    </span>
  );
}
