import { ApiError } from '@inventario/api-client';

/*
 * Clasificación de errores de @inventario/api-client: único lugar que traduce
 * el `status` de `ApiError` a un tipo de error de UI. El status nunca se
 * infiere del texto del mensaje (docs/API_CONTRACTS.md).
 */

export type ApiErrorKind =
  | 'unauthorized' // 401: sin sesión, sesión expirada o credenciales inválidas
  | 'forbidden' // 403: sin permiso o sin tenant activo
  | 'not-found' // 404
  | 'conflict' // 409
  | 'invalid' // 400
  | 'unavailable' // 0 (red), 5xx o API apagada (el proxy de Vite responde 500)
  | 'unexpected'; // respuesta fuera de contrato u otro error

export function getHttpStatus(error: unknown): number | null {
  return error instanceof ApiError ? error.status : null;
}

export function classifyApiError(error: unknown): ApiErrorKind {
  const status = getHttpStatus(error);
  if (status === null) return 'unexpected';
  if (status === 0) return 'unavailable'; // ApiError NETWORK_ERROR
  if (status === 400) return 'invalid';
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not-found';
  if (status === 409) return 'conflict';
  if (status >= 500) return 'unavailable';
  return 'unexpected';
}

/** Mensaje genérico para el usuario según el tipo de error. */
export function apiErrorMessage(kind: ApiErrorKind): string {
  switch (kind) {
    case 'unavailable':
      return 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo nuevamente.';
    case 'forbidden':
      return 'No tienes permiso para realizar esta acción.';
    case 'unauthorized':
      return 'Tu sesión expiró. Vuelve a iniciar sesión.';
    case 'not-found':
      return 'El recurso solicitado no existe o ya no está disponible.';
    case 'invalid':
      return 'Revisa los datos ingresados.';
    case 'conflict':
      return 'La operación entra en conflicto con datos existentes.';
    case 'unexpected':
      return 'Ocurrió un error inesperado. Inténtalo nuevamente.';
  }
}
