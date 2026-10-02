import { useCallback, useEffect, useState } from 'react';
import { classifyApiError, type ApiErrorKind } from '../lib/apiError';
import { useSession } from './SessionProvider';

export type QueryState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; kind: ApiErrorKind };

/**
 * Lectura de datos autenticada. Un 401 cierra la sesión (vuelve al login con
 * aviso de expiración); el resto de errores queda en el estado para la vista.
 * `fetcher` debe ser estable (p. ej. una función de @inventario/api-client).
 */
export function useApiQuery<T>(fetcher: () => Promise<T>) {
  const { expireSession } = useSession();
  const [state, setState] = useState<QueryState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    fetcher()
      .then((data) => {
        if (active) setState({ status: 'success', data });
      })
      .catch((error: unknown) => {
        if (!active) return;
        const kind = classifyApiError(error);
        if (kind === 'unauthorized') expireSession();
        else setState({ status: 'error', kind });
      });
    return () => {
      active = false;
    };
  }, [fetcher, attempt, expireSession]);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  return { state, reload };
}
