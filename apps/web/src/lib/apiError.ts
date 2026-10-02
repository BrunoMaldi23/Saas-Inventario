/*
 * Clasificación de errores de @inventario/api-client.
 *
 * El cliente lanza `Error('API request failed: <status>')` sin exponer el
 * status como dato, y fetch lanza TypeError ante fallas de red. Este módulo es
 * el ÚNICO lugar que interpreta ese formato: si el cliente pasa a exponer un
 * error tipado, solo cambia getHttpStatus().
 */

export type ApiErrorKind =
  | 'unauthorized' // 401: sin sesión, sesión expirada o credenciales inválidas
  | 'forbidden' // 403: sin permiso o sin tenant activo
  | 'not-found' // 404
  | 'conflict' // 409
  | 'invalid' // 400
  | 'unavailable' // red caída, API apagada (el proxy de Vite responde 5xx) o 5xx
  | 'unexpected'; // respuesta fuera de contrato u otro error

const STATUS_PATTERN = /API request failed: (\d{3})/;

export function getHttpStatus(error: unknown): number | null {
  if (!(error instanceof Error)) return null;
  const match = STATUS_PATTERN.exec(error.message);
  return match?.[1] ? Number(match[1]) : null;
}

export function classifyApiError(error: unknown): ApiErrorKind {
  const status = getHttpStatus(error);
  if (status === null) {
    // fetch rechaza con TypeError cuando no hay conexión.
    return error instanceof TypeError ? 'unavailable' : 'unexpected';
  }
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
