import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { IconButton } from './Button';
import { Icon, type IconName } from './Icon';
import { ToastContext, type ToastTone } from './toastContext';

type Toast = { id: number; tone: ToastTone; message: string };

const icons: Record<ToastTone, IconName> = {
  success: 'checkCircle',
  info: 'info',
  warning: 'alertTriangle',
  danger: 'alertCircle',
};

const DURATION_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-2), { id, tone, message }]);
      window.setTimeout(() => dismiss(id), DURATION_MS);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={cx('toast', `toast--${toast.tone}`)}>
            <Icon name={icons[toast.tone]} size={18} className="toast__icon" />
            <p className="toast__message">{toast.message}</p>
            <IconButton
              icon="close"
              label="Descartar notificación"
              onClick={() => dismiss(toast.id)}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
