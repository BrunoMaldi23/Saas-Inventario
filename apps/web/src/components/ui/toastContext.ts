import { createContext, useContext } from 'react';

/* Contexto y hook de toasts, separados de Toast.tsx (ver session/sessionContext.ts). */

export type ToastTone = 'success' | 'info' | 'warning' | 'danger';

export type ToastContextValue = {
  notify: (message: string, tone?: ToastTone) => void;
};

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context)
    throw new Error('useToast debe usarse dentro de <ToastProvider>.');
  return context;
}
