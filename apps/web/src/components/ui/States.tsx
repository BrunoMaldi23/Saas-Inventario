import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import type { Tone } from './Badge';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Spinner } from './Spinner';

/*
 * Estados de vista reutilizables: carga, vacío, error y avisos en línea.
 * Toda pantalla con datos remotos debe resolver estos cuatro casos.
 */

export function LoadingState({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="state" role="status" aria-live="polite">
      <Spinner size={24} />
      <p className="state__description">{label}</p>
    </div>
  );
}

type EmptyStateProps = {
  title: string;
  description?: ReactNode;
  icon?: IconName;
  action?: ReactNode;
  compact?: boolean;
};

export function EmptyState({
  title,
  description,
  icon = 'inbox',
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <div className={cx('state', compact && 'state--compact')}>
      <span className="state__icon">
        <Icon name={icon} size={22} />
      </span>
      <h3 className="state__title">{title}</h3>
      {description && <p className="state__description">{description}</p>}
      {action && <div className="state__action">{action}</div>}
    </div>
  );
}

/** 403: el backend (o los permisos del tenant activo) no permiten el acceso. */
export function ForbiddenState({
  description = 'Tu rol en esta empresa no permite ver esta sección. Si crees que es un error, contacta a un administrador.',
}: {
  description?: ReactNode;
}) {
  return (
    <div className="state" role="alert">
      <span className="state__icon">
        <Icon name="lock" size={22} />
      </span>
      <h3 className="state__title">No tienes permiso</h3>
      <p className="state__description">{description}</p>
    </div>
  );
}

type ErrorStateProps = {
  title?: string;
  icon?: IconName;
  description?: ReactNode;
  onRetry?: () => void;
};

export function ErrorState({
  title = 'No pudimos cargar la información',
  description = 'Revisa tu conexión e inténtalo nuevamente.',
  icon = 'alertTriangle',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="state" role="alert">
      <span className="state__icon state__icon--danger">
        <Icon name={icon} size={22} />
      </span>
      <h3 className="state__title">{title}</h3>
      <p className="state__description">{description}</p>
      {onRetry && (
        <div className="state__action">
          <Button icon="refresh" onClick={onRetry}>
            Reintentar
          </Button>
        </div>
      )}
    </div>
  );
}

const noticeIcons: Record<Tone, IconName> = {
  neutral: 'info',
  info: 'info',
  success: 'checkCircle',
  warning: 'alertTriangle',
  danger: 'alertCircle',
};

type NoticeProps = {
  tone?: Tone;
  title?: string;
  children: ReactNode;
  action?: ReactNode;
};

/** Aviso en línea para mensajes persistentes dentro de una página. */
export function Notice({
  tone = 'info',
  title,
  children,
  action,
}: NoticeProps) {
  return (
    <div
      className={cx('notice', `notice--${tone}`)}
      role={tone === 'danger' ? 'alert' : 'status'}
    >
      <Icon name={noticeIcons[tone]} size={18} className="notice__icon" />
      <div className="notice__body">
        {title && <p className="notice__title">{title}</p>}
        <div>{children}</div>
      </div>
      {action && <div className="notice__action">{action}</div>}
    </div>
  );
}

type SkeletonProps = { width?: string; height?: string; className?: string };

export function Skeleton({
  width = '100%',
  height = '0.875rem',
  className,
}: SkeletonProps) {
  return (
    <span
      className={cx('skeleton', className)}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}
